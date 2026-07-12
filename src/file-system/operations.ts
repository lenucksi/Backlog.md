import { mkdir, readdir, rename, rmdir, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isSeq, parse as parseYaml, visit, Document as YamlDocument } from "yaml";
import { DEFAULT_DIRECTORIES, DEFAULT_FILES, DEFAULT_STATUSES, FALLBACK_STATUS } from "../constants/index.ts";
import { parseDecision, parseDocument, parseMilestone, parseTask } from "../markdown/parser.ts";
import { serializeDecision, serializeDocument, serializeTask } from "../markdown/serializer.ts";
import type {
	BacklogConfig,
	Decision,
	Document,
	LabelConfig,
	Milestone,
	Task,
	TaskListFilter,
} from "../types/index.ts";
import type { BacklogConfigSource } from "../utils/backlog-directory.ts";
import { normalizeProjectBacklogDirectory, resolveBacklogDirectory } from "../utils/backlog-directory.ts";
import { KNOWN_CONFIG_KEYS } from "../utils/config-schema.ts";
import { documentIdsEqual, normalizeDocumentId } from "../utils/document-id.ts";
import { normalizeDocumentRelativePath, normalizeDocumentSubPath } from "../utils/document-path.ts";
import { lockDirectory } from "../utils/file-lock.ts";
import { parseFrontmatter, stringifyFrontmatter } from "../utils/frontmatter.ts";
import { tryWarn } from "../utils/log-error.ts";
import {
	buildGlobPattern,
	extractAnyPrefix,
	generateNextId,
	idForFilename,
	normalizeId,
} from "../utils/prefix-config.ts";
import { getTaskFilename, getTaskPath, normalizeTaskIdentity, taskIdsEqual } from "../utils/task-path.ts";
import { sortByTaskId } from "../utils/task-sorting.ts";

// Interface for task path resolution context
interface TaskPathContext {
	filesystem: {
		tasksDir: string;
	};
}

interface CreateLockOptions {
	timeoutMs?: number;
	retryDelayMs?: number;
	staleMs?: number;
}

const DEFAULT_CREATE_LOCK_TIMEOUT_MS = 30_000;
const DEFAULT_CREATE_LOCK_RETRY_DELAY_MS = 100;
const DEFAULT_CREATE_LOCK_STALE_MS = 10_000;

export const CREATE_LOCK_ERROR_CODE = "ECREATELOCK";
export const CREATE_LOCK_ERROR_MESSAGE =
	"Another task create/promote/demote operation is already in progress. Please try again.";

function createLockError(message: string, cause?: unknown): Error {
	const error = new Error(message, cause === undefined ? undefined : { cause }) as Error & { code?: string };
	error.name = "CreateLockError";
	error.code = CREATE_LOCK_ERROR_CODE;
	return error;
}

export function isCreateLockError(error: unknown): error is Error {
	return (
		error instanceof Error &&
		(error as Error & { code?: string }).code === CREATE_LOCK_ERROR_CODE &&
		error.name === "CreateLockError"
	);
}

function resolvePersistedIdentities(
	existingTask: Task | null,
	task: Task,
	taskId: string,
	prefix: string,
): { id: string; parentTaskId: string | undefined } {
	const persistedTaskId = existingTask?.id && taskIdsEqual(existingTask.id, task.id) ? existingTask.id : taskId;
	const normalizedParentTaskId = task.parentTaskId
		? normalizeId(task.parentTaskId, extractAnyPrefix(task.parentTaskId) ?? prefix)
		: undefined;
	const persistedParentTaskId =
		existingTask?.parentTaskId && task.parentTaskId && taskIdsEqual(existingTask.parentTaskId, task.parentTaskId)
			? existingTask.parentTaskId
			: normalizedParentTaskId;
	return { id: persistedTaskId, parentTaskId: persistedParentTaskId };
}

function documentMatchesId(relative: string, canonicalId: string): boolean {
	const base = relative.split("/").pop() || relative;
	const [candidateId] = base.split(" - ");
	if (!candidateId) return false;
	return documentIdsEqual(canonicalId, candidateId);
}

async function cleanupDocumentDuplicates(docsDir: string, matchesForId: string[], filepath: string): Promise<void> {
	for (const match of matchesForId) {
		const matchPath = join(docsDir, ...normalizeDocumentRelativePath(match).split("/"));
		if (matchPath === filepath) continue;
		try {
			await unlink(matchPath);
		} catch {
			// Ignore cleanup errors - file may have been removed already
		}
	}
}

export class FileSystem {
	private resolvedBacklogDir: string;
	private resolvedBacklogDirName: string;
	private resolvedConfigPath: string;
	private configSource: BacklogConfigSource;
	private readonly projectRoot: string;
	private cachedConfig: BacklogConfig | null = null;
	private cachedRawConfig: Record<string, unknown> | null = null;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
		const resolution = resolveBacklogDirectory(projectRoot);
		this.resolvedBacklogDirName = resolution.backlogDir ?? DEFAULT_DIRECTORIES.BACKLOG;
		this.resolvedBacklogDir = resolution.backlogPath ?? join(projectRoot, DEFAULT_DIRECTORIES.BACKLOG);
		this.resolvedConfigPath = resolution.configPath ?? join(this.resolvedBacklogDir, DEFAULT_FILES.CONFIG);
		this.configSource = resolution.configSource ?? "folder";
	}

	private async getBacklogDir(): Promise<string> {
		return this.resolvedBacklogDir;
	}

	// Public accessors for directory paths
	get backlogDir(): string {
		return this.resolvedBacklogDir;
	}
	get backlogDirName(): string {
		return this.resolvedBacklogDirName;
	}
	get tasksDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.TASKS);
	}

	get completedDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.COMPLETED);
	}

	get archiveTasksDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.ARCHIVE_TASKS);
	}
	get archiveMilestonesDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.ARCHIVE_MILESTONES);
	}
	get decisionsDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.DECISIONS);
	}

	get docsDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.DOCS);
	}

	get milestonesDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.MILESTONES);
	}

	get archiveDocsDir(): string {
		return join(this.resolvedBacklogDir, DEFAULT_DIRECTORIES.ARCHIVE_DOCS);
	}

	get configFilePath(): string {
		return this.resolvedConfigPath;
	}

	/** Get the project root directory */
	get rootDir(): string {
		return this.projectRoot;
	}

	async readProjectFile(relativePath: string): Promise<{ content: string; language: string }> {
		if (relativePath.includes("..")) {
			throw new Error("Invalid path: directory traversal not allowed");
		}
		const resolvedPath = join(this.projectRoot, relativePath);
		if (!resolvedPath.startsWith(this.projectRoot)) {
			throw new Error("Invalid path: outside project root");
		}
		const file = Bun.file(resolvedPath);
		if (!(await file.exists())) {
			throw new Error(`File not found: ${relativePath}`);
		}
		const content = await file.text();
		const filename = relativePath.split("/").pop() || "";
		const ext = filename.includes(".") ? (filename.split(".").pop()?.toLowerCase() ?? "") : "";
		const language = this.detectLanguage(ext, filename);
		return { content, language };
	}

	invalidateConfigCache(): void {
		this.cachedConfig = null;
		this.cachedRawConfig = null;
		const resolution = resolveBacklogDirectory(this.projectRoot);
		this.resolvedBacklogDirName = resolution.backlogDir ?? DEFAULT_DIRECTORIES.BACKLOG;
		this.resolvedBacklogDir = resolution.backlogPath ?? join(this.projectRoot, DEFAULT_DIRECTORIES.BACKLOG);
		this.resolvedConfigPath = resolution.configPath ?? join(this.resolvedBacklogDir, DEFAULT_FILES.CONFIG);
		this.configSource = resolution.configSource ?? "folder";
	}

	setBacklogDirectory(backlogDir: string): void {
		const normalized = normalizeProjectBacklogDirectory(backlogDir);
		if (!normalized) {
			throw new Error("Backlog directory must be a project-relative path.");
		}
		this.resolvedBacklogDirName = normalized;
		this.resolvedBacklogDir = join(this.projectRoot, normalized);
		if (this.configSource === "folder") {
			this.resolvedConfigPath = join(this.resolvedBacklogDir, DEFAULT_FILES.CONFIG);
		}
	}

	setConfigLocation(configSource: BacklogConfigSource): void {
		this.configSource = configSource;
		this.resolvedConfigPath =
			configSource === "root"
				? join(this.projectRoot, DEFAULT_FILES.ROOT_CONFIG)
				: join(this.resolvedBacklogDir, DEFAULT_FILES.CONFIG);
	}

	resolveBacklogDirectoryInfo() {
		return resolveBacklogDirectory(this.projectRoot);
	}

	private async getTasksDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.TASKS);
	}

	async getDraftsDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.DRAFTS);
	}

	async getArchiveTasksDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_TASKS);
	}

	private async getArchiveMilestonesDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_MILESTONES);
	}

	private async getArchiveDraftsDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_DRAFTS);
	}

	private async getDecisionsDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.DECISIONS);
	}

	private async getDocsDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.DOCS);
	}

	private async getMilestonesDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.MILESTONES);
	}

	private async getArchiveDocsDir(): Promise<string> {
		const backlogDir = await this.getBacklogDir();
		return join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_DOCS);
	}

	async ensureBacklogStructure(): Promise<void> {
		const backlogDir = await this.getBacklogDir();

		// Check if the parent path is blocked by a file
		const backlogParent = dirname(backlogDir);
		try {
			const parentStat = await stat(backlogParent);
			if (!parentStat.isDirectory()) {
				throw new Error(
					`Backlog path conflict: "${backlogParent}" exists and is not a directory. ` +
						`Remove it or use a different backlog directory (e.g. ".backlog" via init wizard).`,
				);
			}
		} catch (err) {
			if (err instanceof Error && err.message.startsWith("Backlog path conflict")) throw err;
		}

		const directories = [
			backlogDir,
			join(backlogDir, DEFAULT_DIRECTORIES.TASKS),
			join(backlogDir, DEFAULT_DIRECTORIES.DRAFTS),
			join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_TASKS),
			join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_DRAFTS),
			join(backlogDir, DEFAULT_DIRECTORIES.MILESTONES),
			join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_MILESTONES),
			join(backlogDir, DEFAULT_DIRECTORIES.ARCHIVE_DOCS),
			join(backlogDir, DEFAULT_DIRECTORIES.DOCS),
			join(backlogDir, DEFAULT_DIRECTORIES.DECISIONS),
		];

		for (const dir of directories) {
			await mkdir(dir, { recursive: true }).catch((err: NodeJS.ErrnoException) => {
				if (err.code === "EEXIST") return;
				if (err.code === "ENOTDIR") {
					throw new Error(
						`Cannot create backlog directory at "${dir}": ` +
							`"${backlogDir}" exists and is not a directory. ` +
							`Remove it or use a different backlog directory (e.g. ".backlog").`,
					);
				}
				throw err;
			});
		}
	}

	async migrateCompletedTasks(): Promise<{ migrated: number; total: number }> {
		try {
			const backlogDir = await this.getBacklogDir();
			const completedDir = join(backlogDir, DEFAULT_DIRECTORIES.COMPLETED);
			const archiveTasksDir = await this.getArchiveTasksDir();

			const completedDirExists = await stat(completedDir)
				.then(() => true)
				.catch(() => false);
			if (!completedDirExists) return { migrated: 0, total: 0 };

			const config = await this.loadConfig();
			const taskPrefix = (config?.prefixes?.task ?? "task").toLowerCase();
			const globPattern = buildGlobPattern(taskPrefix);

			const taskFiles = await Array.fromAsync(
				new Bun.Glob(globPattern).scan({ cwd: completedDir, followSymlinks: true }),
			);

			if (taskFiles.length === 0) return { migrated: 0, total: 0 };

			await this.ensureDirectoryExists(archiveTasksDir);

			let migrated = 0;
			for (const file of taskFiles) {
				const source = join(completedDir, file);
				const target = join(archiveTasksDir, file);
				try {
					await rename(source, target);
					// Set frontmatter status to "Archived" after move
					const content = await Bun.file(target).text();
					const parsed = parseFrontmatter(content);
					parsed.data.status = "Archived";
					await Bun.write(target, stringifyFrontmatter(parsed.content, parsed.data));
					migrated++;
				} catch (err) {
					tryWarn("FileSystem", err, "migrateCompletedTasks");
				}
			}

			const remaining = await readdir(completedDir);
			if (remaining.length === 0) {
				await rmdir(completedDir);
			}

			return { migrated, total: taskFiles.length };
		} catch (_error) {
			if (process.env.DEBUG) {
				console.error("Failed to migrate completed tasks:", _error);
			}
			return { migrated: 0, total: 0 };
		}
	}

	private toCreateLockError(error: unknown): Error {
		if (isCreateLockError(error)) {
			return error;
		}

		const code = (error as NodeJS.ErrnoException | undefined)?.code;
		if (code === "ELOCKED") {
			return createLockError(CREATE_LOCK_ERROR_MESSAGE, error instanceof Error ? error.message : String(error));
		}
		if (code === "ECOMPROMISED") {
			return createLockError(
				"Task creation lock was interrupted. Please try again.",
				error instanceof Error ? error.message : String(error),
			);
		}
		return error instanceof Error ? error : new Error(String(error));
	}

	// Uses a maintained lockfile with stale-lock recovery; USE_GLOBAL_TASK_ID_LOCK=false restores legacy behavior.
	async withCreateLock<T>(fn: () => Promise<T>, options: CreateLockOptions = {}): Promise<T> {
		if (process.env.USE_GLOBAL_TASK_ID_LOCK?.toLowerCase() === "false") {
			return await fn();
		}

		const backlogDir = await this.getBacklogDir();
		const locksDir = join(backlogDir, ".locks");
		const lockDir = join(locksDir, "create");
		const timeoutMs = options.timeoutMs ?? DEFAULT_CREATE_LOCK_TIMEOUT_MS;
		const retryDelayMs = options.retryDelayMs ?? DEFAULT_CREATE_LOCK_RETRY_DELAY_MS;
		const staleMs = Math.max(options.staleMs ?? DEFAULT_CREATE_LOCK_STALE_MS, 2_000);
		const retries = Math.max(Math.ceil(timeoutMs / retryDelayMs) - 1, 0);

		await mkdir(locksDir, { recursive: true });

		let release: (() => Promise<void>) | undefined;
		try {
			release = await lockDirectory(lockDir, {
				stale: staleMs,
				retries,
				retryDelay: retryDelayMs,
			});
		} catch (error) {
			throw this.toCreateLockError(error);
		}

		try {
			const result = await fn();
			try {
				await release?.();
			} catch (error) {
				throw this.toCreateLockError(error);
			}
			return result;
		} catch (error) {
			if (release) {
				try {
					await release();
				} catch {
					// Preserve the original operation error if lock cleanup also fails.
				}
			}
			throw error;
		}
	}

	// Task operations
	async saveTask(task: Task): Promise<string> {
		// Extract prefix from task ID, or use configured prefix, or fall back to default "task"
		let prefix = extractAnyPrefix(task.id);
		if (!prefix) {
			const config = await this.loadConfig();
			prefix = config?.prefixes?.task ?? "task";
		}
		const taskId = normalizeId(task.id, prefix);
		const filename = `${idForFilename(taskId)} - ${this.sanitizeFilename(task.title)}.md`;
		const tasksDir = await this.getTasksDir();
		const shouldPreservePath = typeof task.filePath === "string" && task.filePath.trim().length > 0;
		const filepath = shouldPreservePath ? (task.filePath as string) : join(tasksDir, filename);
		let existingTask: Task | null = null;

		if (shouldPreservePath) {
			try {
				existingTask = parseTask(await Bun.file(filepath).text());
			} catch {
				existingTask = null;
			}
		}

		const { id: persistedTaskId, parentTaskId: persistedParentTaskId } = resolvePersistedIdentities(
			existingTask,
			task,
			taskId,
			prefix,
		);

		// Normalize new task IDs before serialization, but preserve existing file identity on updates.
		const normalizedTask = {
			...task,
			id: persistedTaskId,
			parentTaskId: persistedParentTaskId,
		};
		const content = serializeTask(normalizedTask);

		if (!shouldPreservePath) {
			// Delete any existing task files with the same ID but different filenames
			try {
				const core = { filesystem: { tasksDir } };
				const existingPath = await getTaskPath(taskId, core as TaskPathContext);
				if (existingPath && !existingPath.endsWith(filename)) {
					await unlink(existingPath);
				}
			} catch {
				// Ignore errors if no existing files found
			}
		}

		await this.ensureDirectoryExists(dirname(filepath));
		await Bun.write(filepath, content);
		return filepath;
	}

	async loadTask(taskId: string): Promise<Task | null> {
		try {
			const tasksDir = await this.getTasksDir();
			const core = { filesystem: { tasksDir } };
			const filepath = await getTaskPath(taskId, core as TaskPathContext);

			if (!filepath) return null;

			const content = await Bun.file(filepath).text();
			const task = normalizeTaskIdentity(parseTask(content));
			return { ...task, filePath: filepath };
		} catch (_error) {
			return null;
		}
	}

	async listTasks(filter?: TaskListFilter): Promise<Task[]> {
		let tasksDir: string;
		try {
			tasksDir = await this.getTasksDir();
		} catch (_error) {
			return [];
		}

		const config = await this.loadConfig();
		const taskPrefix = (config?.prefixes?.task ?? "task").toLowerCase();
		const globPattern = buildGlobPattern(taskPrefix);

		let taskFiles: string[];
		try {
			taskFiles = await Array.fromAsync(new Bun.Glob(globPattern).scan({ cwd: tasksDir, followSymlinks: true }));
		} catch (_error) {
			return [];
		}

		let tasks: Task[] = [];
		for (const file of taskFiles) {
			const filepath = join(tasksDir, file);
			try {
				const content = await Bun.file(filepath).text();
				const task = normalizeTaskIdentity(parseTask(content));
				tasks.push({ ...task, filePath: filepath });
			} catch (error) {
				if (process.env.DEBUG) {
					console.error(
						`Failed to parse task file ${filepath}`,
						error instanceof Error ? error.message : String(error),
					);
				}
			}
		}

		if (filter?.status) {
			const statusLower = filter.status.toLowerCase();
			tasks = tasks.filter((t) => t.status.toLowerCase() === statusLower);
		}

		if (filter?.assignee) {
			const assignee = filter.assignee;
			tasks = tasks.filter((t) => t.assignee.includes(assignee));
		}

		return sortByTaskId(tasks);
	}

	private async parseTaskFilesFromDir(dir: string, files: string[], label: string): Promise<Task[]> {
		const tasks: Task[] = [];
		for (const file of files) {
			const filepath = join(dir, file);
			try {
				const content = await Bun.file(filepath).text();
				const task = parseTask(content);
				tasks.push({ ...task, filePath: filepath });
			} catch (error) {
				if (process.env.DEBUG) {
					console.error(
						`Failed to parse ${label} task file ${filepath}`,
						error instanceof Error ? error.message : String(error),
					);
				}
			}
		}
		return sortByTaskId(tasks);
	}

	async listArchivedTasks(): Promise<Task[]> {
		return this.listCompletedTasks();
	}

	async listCompletedTasks(): Promise<Task[]> {
		let archiveTasksDir: string;
		try {
			archiveTasksDir = await this.getArchiveTasksDir();
		} catch (_error) {
			return [];
		}

		const config = await this.loadConfig();
		const taskPrefix = (config?.prefixes?.task ?? "task").toLowerCase();
		const globPattern = buildGlobPattern(taskPrefix);

		let taskFiles: string[];
		try {
			taskFiles = await Array.fromAsync(new Bun.Glob(globPattern).scan({ cwd: archiveTasksDir, followSymlinks: true }));
		} catch (_error) {
			return [];
		}

		return await this.parseTaskFilesFromDir(archiveTasksDir, taskFiles, "archived");
	}

	async listOldCompletedDirTasks(): Promise<Task[]> {
		try {
			const backlogDir = await this.getBacklogDir();
			const completedDir = join(backlogDir, DEFAULT_DIRECTORIES.COMPLETED);

			const completedDirExists = await stat(completedDir)
				.then(() => true)
				.catch(() => false);
			if (!completedDirExists) return [];

			const config = await this.loadConfig();
			const taskPrefix = (config?.prefixes?.task ?? "task").toLowerCase();
			const globPattern = buildGlobPattern(taskPrefix);

			const taskFiles = await Array.fromAsync(
				new Bun.Glob(globPattern).scan({ cwd: completedDir, followSymlinks: true }),
			);

			const tasks: Task[] = [];
			for (const file of taskFiles) {
				const filepath = join(completedDir, file);
				try {
					const content = await Bun.file(filepath).text();
					const task = parseTask(content);
					tasks.push({ ...task, filePath: filepath });
				} catch (err) {
					tryWarn("FileSystem", err, "loadTask iteration");
				}
			}

			return sortByTaskId(tasks);
		} catch {
			return [];
		}
	}

	async archiveTask(taskId: string): Promise<boolean> {
		try {
			const tasksDir = await this.getTasksDir();
			const archiveTasksDir = await this.getArchiveTasksDir();
			const core = { filesystem: { tasksDir } };
			const sourcePath = await getTaskPath(taskId, core as TaskPathContext);
			const taskFile = await getTaskFilename(taskId, core as TaskPathContext);

			if (!sourcePath || !taskFile) return false;

			const targetPath = join(archiveTasksDir, taskFile);

			// Ensure target directory exists
			await this.ensureDirectoryExists(dirname(targetPath));

			// Use rename for proper Git move detection
			await rename(sourcePath, targetPath);

			// Set frontmatter status to "Archived" after move
			const content = await Bun.file(targetPath).text();
			const parsed = parseFrontmatter(content);
			parsed.data.status = "Archived";
			await Bun.write(targetPath, stringifyFrontmatter(parsed.content, parsed.data));

			return true;
		} catch (_error) {
			return false;
		}
	}

	async archiveDraft(draftId: string): Promise<boolean> {
		try {
			const draftsDir = await this.getDraftsDir();
			const archiveDraftsDir = await this.getArchiveDraftsDir();

			// Find draft file with draft- prefix
			const files = await Array.fromAsync(
				new Bun.Glob(buildGlobPattern("draft")).scan({ cwd: draftsDir, followSymlinks: true }),
			);
			const normalizedId = normalizeId(draftId, "draft");
			const filenameId = idForFilename(normalizedId);
			const draftFile = files.find((f) => f.startsWith(`${filenameId} -`) || f.startsWith(`${filenameId}-`));

			if (!draftFile) return false;

			const sourcePath = join(draftsDir, draftFile);
			const targetPath = join(archiveDraftsDir, draftFile);

			const content = await Bun.file(sourcePath).text();
			await this.ensureDirectoryExists(dirname(targetPath));
			await Bun.write(targetPath, content);

			await unlink(sourcePath);

			return true;
		} catch {
			return false;
		}
	}

	async promoteDraft(draftId: string): Promise<boolean> {
		try {
			return await this.withCreateLock(async () => {
				const draft = await this.loadDraft(draftId);
				if (!draft?.filePath) return false;

				// Get task prefix from config (default: "task")
				const config = await this.loadConfig();
				const taskPrefix = config?.prefixes?.task ?? "task";

				// Get existing task IDs to generate next ID
				// Include both active and completed tasks to prevent ID collisions
				const existingTasks = await this.listTasks();
				const completedTasks = await this.listCompletedTasks();
				const existingIds = [...existingTasks, ...completedTasks].map((t) => t.id);

				// Generate new task ID
				const newTaskId = generateNextId(existingIds, taskPrefix, config?.zeroPaddedIds);

				const promotedStatus =
					!draft.status || draft.status.trim().toLowerCase() === "draft"
						? config?.defaultStatus || FALLBACK_STATUS
						: draft.status;

				// Draft-only statuses should enter the normal task workflow.
				const promotedTask: Task = {
					...draft,
					id: newTaskId,
					status: promotedStatus,
					filePath: undefined, // Will be set by saveTask
				};

				await this.saveTask(promotedTask);

				await unlink(draft.filePath);

				return true;
			});
		} catch (error) {
			if (isCreateLockError(error)) {
				throw error;
			}
			return false;
		}
	}

	async demoteTask(taskId: string): Promise<boolean> {
		try {
			return await this.withCreateLock(async () => {
				const task = await this.loadTask(taskId);
				if (!task?.filePath) return false;

				// Get existing draft IDs to generate next ID
				// Draft prefix is always "draft" (not configurable like task prefix)
				const existingDrafts = await this.listDrafts();
				const existingIds = existingDrafts.map((d) => d.id);

				const config = await this.loadConfig();
				const newDraftId = generateNextId(existingIds, "draft", config?.zeroPaddedIds);

				const demotedDraft: Task = {
					...task,
					id: newDraftId,
					filePath: undefined,
				};

				await this.saveDraft(demotedDraft);

				await unlink(task.filePath);

				return true;
			});
		} catch (error) {
			if (isCreateLockError(error)) {
				throw error;
			}
			return false;
		}
	}

	// Draft operations
	async saveDraft(task: Task): Promise<string> {
		const draftId = normalizeId(task.id, "draft");
		const filename = `${idForFilename(draftId)} - ${this.sanitizeFilename(task.title)}.md`;
		const draftsDir = await this.getDraftsDir();
		const filepath = join(draftsDir, filename);
		// Normalize the draft ID to uppercase before serialization
		const normalizedTask = { ...task, id: draftId };
		const content = serializeTask(normalizedTask);

		try {
			// Find existing draft file with same ID but possibly different filename (e.g., title changed)
			const filenameId = idForFilename(draftId);
			const existingFiles = await Array.fromAsync(
				new Bun.Glob(buildGlobPattern("draft")).scan({ cwd: draftsDir, followSymlinks: true }),
			);
			const existingFile = existingFiles.find((f) => f.startsWith(`${filenameId} -`) || f.startsWith(`${filenameId}-`));
			if (existingFile && existingFile !== filename) {
				await unlink(join(draftsDir, existingFile));
			}
		} catch {
			// Ignore errors if no existing files found
		}

		await this.ensureDirectoryExists(dirname(filepath));
		await Bun.write(filepath, content);
		return filepath;
	}

	async loadDraft(draftId: string): Promise<Task | null> {
		try {
			const draftsDir = await this.getDraftsDir();
			// Search for draft files with draft- prefix
			const files = await Array.fromAsync(
				new Bun.Glob(buildGlobPattern("draft")).scan({ cwd: draftsDir, followSymlinks: true }),
			);
			const normalizedId = normalizeId(draftId, "draft");
			const filenameId = idForFilename(normalizedId);

			// Find matching draft file
			const draftFile = files.find((f) => f.startsWith(`${filenameId} -`) || f.startsWith(`${filenameId}-`));
			if (!draftFile) return null;

			const filepath = join(draftsDir, draftFile);
			const content = await Bun.file(filepath).text();
			const task = normalizeTaskIdentity(parseTask(content));
			return { ...task, filePath: filepath };
		} catch {
			return null;
		}
	}

	async listDrafts(): Promise<Task[]> {
		try {
			const draftsDir = await this.getDraftsDir();
			const taskFiles = await Array.fromAsync(
				new Bun.Glob(buildGlobPattern("draft")).scan({ cwd: draftsDir, followSymlinks: true }),
			);

			const tasks: Task[] = [];
			for (const file of taskFiles) {
				const filepath = join(draftsDir, file);
				const content = await Bun.file(filepath).text();
				const task = normalizeTaskIdentity(parseTask(content));
				tasks.push({ ...task, filePath: filepath });
			}

			return sortByTaskId(tasks);
		} catch {
			return [];
		}
	}

	// Decision log operations
	async saveDecision(decision: Decision): Promise<void> {
		// Normalize ID - remove "decision-" prefix if present
		const normalizedId = decision.id.replace(/^decision-/, "");
		const filename = `decision-${normalizedId} - ${this.sanitizeFilename(decision.title)}.md`;
		const decisionsDir = await this.getDecisionsDir();
		const filepath = join(decisionsDir, filename);
		const content = serializeDecision(decision);

		const matches = await Array.fromAsync(
			new Bun.Glob("decision-*.md").scan({ cwd: decisionsDir, followSymlinks: true }),
		);
		for (const match of matches) {
			if (match === filename) continue;
			if (!match.startsWith(`decision-${normalizedId} -`)) continue;
			try {
				await unlink(join(decisionsDir, match));
			} catch {
				// Ignore cleanup errors
			}
		}

		await this.ensureDirectoryExists(dirname(filepath));
		await Bun.write(filepath, content);
	}

	async loadDecision(decisionId: string): Promise<Decision | null> {
		try {
			const decisionsDir = await this.getDecisionsDir();
			const files = await Array.fromAsync(
				new Bun.Glob("decision-*.md").scan({ cwd: decisionsDir, followSymlinks: true }),
			);

			// Normalize ID - remove "decision-" prefix if present
			const normalizedId = decisionId.replace(/^decision-/, "");
			const decisionFile = files.find((file) => file.startsWith(`decision-${normalizedId} -`));

			if (!decisionFile) return null;

			const filepath = join(decisionsDir, decisionFile);
			const content = await Bun.file(filepath).text();
			return parseDecision(content);
		} catch (_error) {
			return null;
		}
	}

	// Document operations
	async saveDocument(document: Document, subPath = ""): Promise<string> {
		const docsDir = await this.getDocsDir();
		const canonicalId = normalizeDocumentId(document.id);
		document.id = canonicalId;
		const filename = `${canonicalId} - ${this.sanitizeFilename(document.title)}.md`;
		const normalizedSubPath = normalizeDocumentSubPath(subPath);
		const relativePath = normalizedSubPath ? `${normalizedSubPath}/${filename}` : filename;
		const filepath = join(docsDir, ...relativePath.split("/"));
		const content = serializeDocument(document);

		await this.ensureDirectoryExists(dirname(filepath));

		const glob = new Bun.Glob("**/doc-*.md");
		const existingMatches = (await Array.fromAsync(glob.scan({ cwd: docsDir, followSymlinks: true }))).map((relative) =>
			normalizeDocumentRelativePath(relative),
		);
		const matchesForId = existingMatches.filter((relative) => documentMatchesId(relative, canonicalId));

		let sourceRelativePath = document.path ? normalizeDocumentRelativePath(document.path) : undefined;
		if (!sourceRelativePath && matchesForId.length > 0) {
			sourceRelativePath = normalizeDocumentRelativePath(matchesForId[0] ?? "");
		}

		if (sourceRelativePath && sourceRelativePath !== relativePath) {
			const sourcePath = join(docsDir, ...sourceRelativePath.split("/"));
			try {
				await this.ensureDirectoryExists(dirname(filepath));
				await rename(sourcePath, filepath);
			} catch (error) {
				const code = (error as NodeJS.ErrnoException | undefined)?.code;
				if (code !== "ENOENT") {
					throw error;
				}
			}
		}

		await cleanupDocumentDuplicates(docsDir, matchesForId, filepath);

		await Bun.write(filepath, content);

		document.path = relativePath;
		return relativePath;
	}

	async listDecisions(): Promise<Decision[]> {
		try {
			const decisionsDir = await this.getDecisionsDir();
			const decisionFiles = await Array.fromAsync(
				new Bun.Glob("decision-*.md").scan({ cwd: decisionsDir, followSymlinks: true }),
			);
			const decisions: Decision[] = [];
			for (const file of decisionFiles) {
				// Filter out README files as they're just instruction files
				if (file.toLowerCase().match(/^readme\.md$/i)) {
					continue;
				}
				const filepath = join(decisionsDir, file);
				const content = await Bun.file(filepath).text();
				decisions.push(parseDecision(content));
			}
			return sortByTaskId(decisions);
		} catch {
			return [];
		}
	}

	async listDocuments(): Promise<Document[]> {
		try {
			const docsDir = await this.getDocsDir();
			// Recursively include all markdown files under docs, excluding README.md variants
			const glob = new Bun.Glob("**/*.md");
			const docFiles = await Array.fromAsync(glob.scan({ cwd: docsDir, followSymlinks: true }));
			const docs: Document[] = [];
			for (const file of docFiles) {
				const relativePath = normalizeDocumentRelativePath(file);
				const base = relativePath.split("/").pop() || relativePath;
				if (base.toLowerCase() === "readme.md") continue;
				const filepath = join(docsDir, ...relativePath.split("/"));
				const content = await Bun.file(filepath).text();
				const parsed = parseDocument(content);
				docs.push({
					...parsed,
					path: relativePath,
				});
			}

			// Stable sort by title for UI/CLI listing
			return docs.sort((a, b) => a.title.localeCompare(b.title));
		} catch {
			return [];
		}
	}

	async loadDocument(id: string): Promise<Document> {
		const documents = await this.listDocuments();
		const document = documents.find((doc) => documentIdsEqual(id, doc.id));
		if (!document) {
			throw new Error(`Document not found: ${id}`);
		}
		return document;
	}

	async listArchivedDocuments(): Promise<Array<{ id: string; title: string; path: string }>> {
		try {
			const archiveDir = await this.getArchiveDocsDir();
			const glob = new Bun.Glob("**/*.md");
			const files = await Array.fromAsync(glob.scan({ cwd: archiveDir, followSymlinks: true }));
			const docs: Array<{ id: string; title: string; path: string }> = [];
			for (const file of files) {
				const filepath = join(archiveDir, file);
				const content = await Bun.file(filepath).text();
				const parsed = parseFrontmatter(content);
				const id = (parsed.data.id as string) || file.replace(/\.md$/, "");
				const title = (parsed.data.title as string) || file;
				docs.push({ id, title, path: file });
			}
			return docs;
		} catch {
			return [];
		}
	}

	async restoreDocument(id: string): Promise<boolean> {
		try {
			const archiveDir = await this.getArchiveDocsDir();
			const docsDir = await this.getDocsDir();
			const glob = new Bun.Glob("**/doc-*.md");
			const files = await Array.fromAsync(glob.scan({ cwd: archiveDir, followSymlinks: true }));
			for (const file of files) {
				const filepath = join(archiveDir, file);
				const content = await Bun.file(filepath).text();
				const parsed = parseFrontmatter(content);
				if (parsed.data.id === id || file.startsWith(`${id} -`) || file.startsWith(`doc-${id} -`)) {
					const targetPath = join(docsDir, file);
					await this.ensureDirectoryExists(dirname(targetPath));
					await rename(filepath, targetPath);
					return true;
				}
			}
			return false;
		} catch {
			return false;
		}
	}

	async reopenTask(taskId: string): Promise<boolean> {
		try {
			const archiveTasksDir = await this.getArchiveTasksDir();
			const config = await this.loadConfig();
			const taskPrefix = (config?.prefixes?.task ?? "task").toLowerCase();
			const globPattern = buildGlobPattern(taskPrefix);
			const files = await Array.fromAsync(
				new Bun.Glob(globPattern).scan({ cwd: archiveTasksDir, followSymlinks: true }),
			);
			const normalizedId = normalizeId(taskId, taskPrefix);
			const filenameId = idForFilename(normalizedId);
			const completedFile = files.find((f) => f.startsWith(`${filenameId} -`) || f.startsWith(`${filenameId}-`));
			if (!completedFile) return false;

			const sourcePath = join(archiveTasksDir, completedFile);
			const content = await Bun.file(sourcePath).text();
			const task = parseTask(content);
			task.status = "To Do";
			task.filePath = undefined;
			await this.saveTask(task);
			await unlink(sourcePath);
			return true;
		} catch {
			return false;
		}
	}

	async archiveDocument(id: string): Promise<boolean> {
		try {
			const doc = await this.loadDocument(id);
			const docsDir = await this.getDocsDir();
			const archiveDir = await this.getArchiveDocsDir();
			const relativePath = normalizeDocumentRelativePath(doc.path ?? `${doc.id}.md`);
			const sourcePath = join(docsDir, ...relativePath.split("/"));
			const targetPath = join(archiveDir, ...relativePath.split("/"));
			await this.ensureDirectoryExists(dirname(targetPath));
			await rename(sourcePath, targetPath);
			return true;
		} catch {
			return false;
		}
	}

	async deleteDocument(id: string): Promise<boolean> {
		try {
			const doc = await this.loadDocument(id);
			const docsDir = await this.getDocsDir();
			const relativePath = normalizeDocumentRelativePath(doc.path ?? `${doc.id}.md`);
			const filePath = join(docsDir, ...relativePath.split("/"));
			await unlink(filePath);
			return true;
		} catch {
			return false;
		}
	}

	private buildMilestoneIdentifierKeys(identifier: string): Set<string> {
		const normalized = identifier.trim().toLowerCase();
		const keys = new Set<string>();
		if (!normalized) {
			return keys;
		}

		keys.add(normalized);

		if (/^\d+$/.test(normalized)) {
			const numeric = String(Number.parseInt(normalized, 10));
			keys.add(numeric);
			keys.add(`m-${numeric}`);
			return keys;
		}

		const milestoneIdMatch = normalized.match(/^m-(\d+)$/);
		if (milestoneIdMatch?.[1]) {
			const numeric = String(Number.parseInt(milestoneIdMatch[1], 10));
			keys.add(numeric);
			keys.add(`m-${numeric}`);
		}

		return keys;
	}

	private buildMilestoneFilename(id: string, title: string): string {
		const safeTitle = title
			.replace(/[<>:"/\\|?*]/g, "")
			.replace(/\s+/g, "-")
			.toLowerCase()
			.slice(0, 50);
		return `${id} - ${safeTitle}.md`;
	}

	private serializeMilestoneContent(id: string, title: string, rawContent: string): string {
		return `---
id: ${id}
title: "${title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
---

${rawContent.trim()}
`;
	}

	private rewriteDefaultMilestoneDescription(rawContent: string, previousTitle: string, nextTitle: string): string {
		const defaultDescription = `Milestone: ${previousTitle}`;
		const descriptionSectionPattern = /(##\s+Description\s*(?:\r?\n)+)([\s\S]*?)(?=(?:\r?\n)##\s+|$)/i;

		return rawContent.replace(descriptionSectionPattern, (fullSection, heading: string, body: string) => {
			if (body.trim() !== defaultDescription) {
				return fullSection;
			}
			const trailingWhitespace = body.match(/\s*$/)?.[0] ?? "";
			return `${heading}Milestone: ${nextTitle}${trailingWhitespace}`;
		});
	}

	private async findMilestoneFile(
		identifier: string,
		scope: "active" | "archived" = "active",
	): Promise<{
		file: string;
		filepath: string;
		content: string;
		milestone: Milestone;
	} | null> {
		const normalizedInput = identifier.trim().toLowerCase();
		const candidateKeys = this.buildMilestoneIdentifierKeys(identifier);
		if (candidateKeys.size === 0) {
			return null;
		}
		const variantKeys = new Set<string>(candidateKeys);
		variantKeys.delete(normalizedInput);
		const canonicalInputId =
			/^\d+$/.test(normalizedInput) || /^m-\d+$/.test(normalizedInput)
				? `m-${String(Number.parseInt(normalizedInput.replace(/^m-/, ""), 10))}`
				: null;

		const milestonesDir = scope === "archived" ? await this.getArchiveMilestonesDir() : await this.getMilestonesDir();
		const milestoneFiles = await Array.fromAsync(
			new Bun.Glob("m-*.md").scan({ cwd: milestonesDir, followSymlinks: true }),
		);

		const rawExactIdMatches: Array<{ file: string; filepath: string; content: string; milestone: Milestone }> = [];
		const canonicalRawIdMatches: Array<{ file: string; filepath: string; content: string; milestone: Milestone }> = [];
		const exactAliasIdMatches: Array<{ file: string; filepath: string; content: string; milestone: Milestone }> = [];
		const exactTitleMatches: Array<{ file: string; filepath: string; content: string; milestone: Milestone }> = [];
		const variantIdMatches: Array<{ file: string; filepath: string; content: string; milestone: Milestone }> = [];
		const variantTitleMatches: Array<{ file: string; filepath: string; content: string; milestone: Milestone }> = [];

		for (const file of milestoneFiles) {
			if (file.toLowerCase() === "readme.md") {
				continue;
			}
			const filepath = join(milestonesDir, file);
			const content = await Bun.file(filepath).text();
			let milestone: Milestone;
			try {
				milestone = parseMilestone(content);
			} catch {
				continue;
			}
			const idKey = milestone.id.trim().toLowerCase();
			const idKeys = this.buildMilestoneIdentifierKeys(milestone.id);
			const titleKey = milestone.title.trim().toLowerCase();

			if (idKey === normalizedInput) {
				rawExactIdMatches.push({ file, filepath, content, milestone });
				continue;
			}
			if (canonicalInputId && idKey === canonicalInputId) {
				canonicalRawIdMatches.push({ file, filepath, content, milestone });
				continue;
			}
			if (idKeys.has(normalizedInput)) {
				exactAliasIdMatches.push({ file, filepath, content, milestone });
				continue;
			}
			if (titleKey === normalizedInput) {
				exactTitleMatches.push({ file, filepath, content, milestone });
				continue;
			}
			if (Array.from(idKeys).some((key) => variantKeys.has(key))) {
				variantIdMatches.push({ file, filepath, content, milestone });
				continue;
			}
			if (variantKeys.has(titleKey)) {
				variantTitleMatches.push({ file, filepath, content, milestone });
			}
		}

		const preferIdMatches = /^\d+$/.test(normalizedInput) || /^m-\d+$/.test(normalizedInput);
		const exactTitleMatch = exactTitleMatches.length === 1 ? exactTitleMatches[0] : null;
		const variantTitleMatch = variantTitleMatches.length === 1 ? variantTitleMatches[0] : null;
		const exactAliasIdMatch = exactAliasIdMatches.length === 1 ? exactAliasIdMatches[0] : null;
		const variantIdMatch = variantIdMatches.length === 1 ? variantIdMatches[0] : null;
		if (preferIdMatches) {
			return (
				rawExactIdMatches[0] ??
				canonicalRawIdMatches[0] ??
				exactAliasIdMatch ??
				variantIdMatch ??
				exactTitleMatch ??
				variantTitleMatch ??
				null
			);
		}
		return (
			rawExactIdMatches[0] ?? exactTitleMatch ?? canonicalRawIdMatches[0] ?? variantIdMatch ?? variantTitleMatch ?? null
		);
	}

	// Milestone operations
	async listMilestones(): Promise<Milestone[]> {
		try {
			const milestonesDir = await this.getMilestonesDir();
			const milestoneFiles = await Array.fromAsync(
				new Bun.Glob("m-*.md").scan({ cwd: milestonesDir, followSymlinks: true }),
			);
			const milestones: Milestone[] = [];
			for (const file of milestoneFiles) {
				// Filter out README files
				if (file.toLowerCase() === "readme.md") {
					continue;
				}
				const filepath = join(milestonesDir, file);
				const content = await Bun.file(filepath).text();
				milestones.push(parseMilestone(content));
			}
			// Sort by ID for consistent ordering
			return milestones.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
		} catch {
			return [];
		}
	}

	async listAllMilestones(): Promise<{ active: Milestone[]; archived: Milestone[] }> {
		const [active, archived] = await Promise.all([this.listMilestones(), this.listArchivedMilestones()]);
		return { active, archived };
	}

	async listArchivedMilestones(): Promise<Milestone[]> {
		try {
			const milestonesDir = await this.getArchiveMilestonesDir();
			const milestoneFiles = await Array.fromAsync(
				new Bun.Glob("m-*.md").scan({ cwd: milestonesDir, followSymlinks: true }),
			);
			const milestones: Milestone[] = [];
			for (const file of milestoneFiles) {
				if (file.toLowerCase() === "readme.md") {
					continue;
				}
				const filepath = join(milestonesDir, file);
				const content = await Bun.file(filepath).text();
				milestones.push(parseMilestone(content));
			}
			return milestones.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
		} catch {
			return [];
		}
	}

	async loadMilestone(id: string): Promise<Milestone | null> {
		try {
			const milestoneMatch = await this.findMilestoneFile(id, "active");
			return milestoneMatch?.milestone ?? null;
		} catch (_error) {
			return null;
		}
	}

	async createMilestone(title: string, description?: string): Promise<Milestone> {
		return await this.withCreateLock(async () => {
			const milestonesDir = await this.getMilestonesDir();

			// Ensure milestones directory exists
			await mkdir(milestonesDir, { recursive: true });

			// Find next available milestone ID
			const archiveMilestonesDir = await this.getArchiveMilestonesDir();
			await mkdir(archiveMilestonesDir, { recursive: true });
			const [existingFiles, archivedFiles] = await Promise.all([
				Array.fromAsync(new Bun.Glob("m-*.md").scan({ cwd: milestonesDir, followSymlinks: true })),
				Array.fromAsync(new Bun.Glob("m-*.md").scan({ cwd: archiveMilestonesDir, followSymlinks: true })),
			]);
			const parseMilestoneId = async (dir: string, file: string): Promise<number | null> => {
				if (file.toLowerCase() === "readme.md") {
					return null;
				}
				const filepath = join(dir, file);
				try {
					const content = await Bun.file(filepath).text();
					const parsed = parseMilestone(content);
					const parsedIdMatch = parsed.id.match(/^m-(\d+)$/i);
					if (parsedIdMatch?.[1]) {
						return Number.parseInt(parsedIdMatch[1], 10);
					}
				} catch {
					// Fall through to filename-based fallback.
				}
				const filenameIdMatch = file.match(/^m-(\d+)/i);
				if (filenameIdMatch?.[1]) {
					return Number.parseInt(filenameIdMatch[1], 10);
				}
				return null;
			};
			const existingIds = (
				await Promise.all([
					...existingFiles.map((file) => parseMilestoneId(milestonesDir, file)),
					...archivedFiles.map((file) => parseMilestoneId(archiveMilestonesDir, file)),
				])
			).filter((id): id is number => typeof id === "number" && id >= 0);

			const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0;
			const id = `m-${nextId}`;

			const filename = this.buildMilestoneFilename(id, title);
			const content = this.serializeMilestoneContent(
				id,
				title,
				`## Description

${description || `Milestone: ${title}`}`,
			);

			const filepath = join(milestonesDir, filename);
			await Bun.write(filepath, content);

			return {
				id,
				title,
				description: description || `Milestone: ${title}`,
				rawContent: parseMilestone(content).rawContent,
			};
		});
	}

	async renameMilestone(
		identifier: string,
		title: string,
	): Promise<{
		success: boolean;
		sourcePath?: string;
		targetPath?: string;
		milestone?: Milestone;
		previousTitle?: string;
	}> {
		const normalizedTitle = title.trim();
		if (!normalizedTitle) {
			return { success: false };
		}

		let sourcePath: string | undefined;
		let targetPath: string | undefined;
		let movedFile = false;
		let originalContent: string | undefined;

		try {
			const milestoneMatch = await this.findMilestoneFile(identifier, "active");
			if (!milestoneMatch) {
				return { success: false };
			}

			const { milestone } = milestoneMatch;
			const milestonesDir = await this.getMilestonesDir();
			const targetFilename = this.buildMilestoneFilename(milestone.id, normalizedTitle);
			targetPath = join(milestonesDir, targetFilename);
			sourcePath = milestoneMatch.filepath;
			originalContent = milestoneMatch.content;
			const nextRawContent = this.rewriteDefaultMilestoneDescription(
				milestone.rawContent,
				milestone.title,
				normalizedTitle,
			);
			const updatedContent = this.serializeMilestoneContent(milestone.id, normalizedTitle, nextRawContent);

			if (sourcePath !== targetPath) {
				if (await Bun.file(targetPath).exists()) {
					return { success: false };
				}
				await rename(sourcePath, targetPath);
				movedFile = true;
			}
			await Bun.write(targetPath, updatedContent);

			return {
				success: true,
				sourcePath,
				targetPath,
				milestone: parseMilestone(updatedContent),
				previousTitle: milestone.title,
			};
		} catch {
			try {
				if (movedFile && sourcePath && targetPath && sourcePath !== targetPath) {
					await rename(targetPath, sourcePath);
					if (originalContent) {
						await Bun.write(sourcePath, originalContent);
					}
				} else if (originalContent) {
					const restorePath = sourcePath ?? targetPath;
					if (restorePath) {
						await Bun.write(restorePath, originalContent);
					}
				}
			} catch {
				// Ignore rollback failures and surface operation failure to caller.
			}
			return { success: false };
		}
	}

	async setMilestoneDescription(
		identifier: string,
		description?: string,
	): Promise<{ success: boolean; milestone?: Milestone }> {
		try {
			const milestoneMatch = await this.findMilestoneFile(identifier, "active");
			if (!milestoneMatch) {
				return { success: false };
			}

			const { milestone } = milestoneMatch;
			const sectionPattern = /(##\s+Description\s*(?:\r?\n)+)([\s\S]*?)(?=(?:\r?\n)##\s+|$)/i;
			const newBody = (description ?? "").trim() || `Milestone: ${milestone.title}`;
			const nextRawContent = milestone.rawContent.replace(sectionPattern, (fullSection, heading) => {
				const trailingWhitespace = fullSection.match(/\s*$/)?.[0] ?? "";
				return `${heading}${newBody}${trailingWhitespace}`;
			});
			const updatedContent = this.serializeMilestoneContent(milestone.id, milestone.title, nextRawContent);
			await Bun.write(milestoneMatch.filepath, updatedContent);

			return { success: true, milestone: parseMilestone(updatedContent) };
		} catch {
			return { success: false };
		}
	}

	async archiveMilestone(identifier: string): Promise<{
		success: boolean;
		sourcePath?: string;
		targetPath?: string;
		milestone?: Milestone;
	}> {
		const normalized = identifier.trim();
		if (!normalized) {
			return { success: false };
		}

		try {
			const milestoneMatch = await this.findMilestoneFile(normalized, "active");
			if (!milestoneMatch) {
				return { success: false };
			}

			const archiveDir = await this.getArchiveMilestonesDir();
			const targetPath = join(archiveDir, milestoneMatch.file);
			await this.ensureDirectoryExists(dirname(targetPath));
			await rename(milestoneMatch.filepath, targetPath);

			return {
				success: true,
				sourcePath: milestoneMatch.filepath,
				targetPath,
				milestone: milestoneMatch.milestone,
			};
		} catch (_error) {
			return { success: false };
		}
	}

	// Config operations
	async loadConfig(): Promise<BacklogConfig | null> {
		if (this.cachedConfig !== null) {
			return this.cachedConfig;
		}

		try {
			const configPath = this.resolvedConfigPath;
			const file = Bun.file(configPath);
			const exists = await file.exists();
			if (!exists) return null;

			const content = await file.text();
			const result = this.parseConfig(content);

			this.cachedConfig = result.config;
			this.cachedRawConfig = result.raw;
			return result.config;
		} catch (_error) {
			return null;
		}
	}

	async loadRawConfig(): Promise<Record<string, unknown> | null> {
		if (this.cachedRawConfig !== null) {
			return this.cachedRawConfig;
		}

		try {
			const configPath = this.resolvedConfigPath;
			const file = Bun.file(configPath);
			const exists = await file.exists();
			if (!exists) return null;

			const content = await file.text();
			const raw = parseYaml(content) as Record<string, unknown>;

			this.cachedRawConfig = raw;
			return raw;
		} catch {
			return null;
		}
	}

	async saveConfig(config: BacklogConfig): Promise<void> {
		const normalizedConfig: BacklogConfig = {
			...config,
			...(this.configSource === "root" ? { backlogDirectory: this.resolvedBacklogDirName } : {}),
			definitionOfDone: this.normalizeDefinitionOfDone(config.definitionOfDone),
			newStatuses: config.newStatuses?.length ? config.newStatuses : undefined,
			runningStatuses: config.runningStatuses?.length ? config.runningStatuses : undefined,
			terminalStatuses: config.terminalStatuses?.length ? config.terminalStatuses : undefined,
			blockedStatuses: config.blockedStatuses?.length ? config.blockedStatuses : undefined,
		};
		if (this.configSource === "folder") {
			delete normalizedConfig.backlogDirectory;
		}

		const raw = this.cachedRawConfig ?? {};
		const mapped = this.configToRaw(normalizedConfig);
		const merged = { ...raw, ...mapped };
		// Remove legacy dod_defaults and milestones keys — we use filesystem-backed equivalents
		delete merged.dod_defaults;
		delete merged.milestones;

		const configPath = this.resolvedConfigPath;
		const content = this.serializeConfig(merged);
		await Bun.write(configPath, content);
		this.cachedConfig = normalizedConfig;
		this.cachedRawConfig = merged;
	}

	// Utility methods
	private detectLanguage(ext: string, filename: string): string {
		if (!ext) {
			const nameMap: Record<string, string> = {
				dockerfile: "dockerfile",
				makefile: "makefile",
				gemfile: "ruby",
			};
			return nameMap[filename.toLowerCase()] ?? "";
		}
		const map: Record<string, string> = {
			ts: "typescript",
			tsx: "typescriptreact",
			js: "javascript",
			jsx: "javascriptreact",
			json: "json",
			md: "markdown",
			mdc: "markdown",
			css: "css",
			html: "html",
			yaml: "yaml",
			yml: "yaml",
			py: "python",
			rs: "rust",
			go: "go",
			java: "java",
			c: "c",
			cc: "cpp",
			cpp: "cpp",
			h: "c",
			hpp: "cpp",
			sh: "bash",
			bash: "bash",
			zsh: "bash",
			sql: "sql",
			xml: "xml",
			toml: "toml",
			ini: "ini",
			cfg: "ini",
			ruby: "ruby",
			rb: "ruby",
			php: "php",
			swift: "swift",
			kt: "kotlin",
			dart: "dart",
			scala: "scala",
			vue: "vue",
			svelte: "svelte",
			graphql: "graphql",
			gql: "graphql",
			diff: "diff",
			patch: "diff",
			tex: "latex",
			pl: "perl",
			r: "r",
			lua: "lua",
			ex: "elixir",
			exs: "elixir",
			elm: "elm",
			erl: "erlang",
			hrl: "erlang",
			clj: "clojure",
			cljs: "clojure",
			edn: "clojure",
			hs: "haskell",
			lhs: "haskell",
			nix: "nix",
			sass: "sass",
			scss: "scss",
			less: "less",
			wasm: "wasm",
		};
		return map[ext] ?? "";
	}

	private sanitizeFilename(filename: string): string {
		// Remove path-unsafe characters, then strip noisy punctuation before normalizing whitespace
		return (
			filename
				.replace(/[<>:"/\\|?*]/g, "-")
				// biome-ignore lint/complexity/noUselessEscapeInRegex: we need explicit escapes inside the character class
				.replace(/['(),!@#$%^&+=\[\]{};]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.replace(/^-|-$/g, "")
		);
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		await mkdir(dirPath, { recursive: true });
	}

	private snakeToCamel: Record<string, keyof BacklogConfig | "prefixesTask"> = {
		project_name: "projectName",
		default_assignee: "defaultAssignee",
		default_reporter: "defaultReporter",
		default_status: "defaultStatus",
		statuses: "statuses",
		new_statuses: "newStatuses",
		running_statuses: "runningStatuses",
		terminal_statuses: "terminalStatuses",
		blocked_statuses: "blockedStatuses",
		labels: "labels",
		authors: "authors",
		definition_of_done: "definitionOfDone",
		dod_defaults: "definitionOfDone",
		max_column_width: "maxColumnWidth",
		default_editor: "defaultEditor",
		auto_open_browser: "autoOpenBrowser",
		default_port: "defaultPort",
		remote_operations: "remoteOperations",
		auto_commit: "autoCommit",
		filesystem_only: "filesystemOnly",
		zero_padded_ids: "zeroPaddedIds",
		bypass_git_hooks: "bypassGitHooks",
		check_active_branches: "checkActiveBranches",
		active_branch_days: "activeBranchDays",
		on_status_change: "onStatusChange",
		task_prefix: "prefixesTask",
		backlog_directory: "backlogDirectory",
		auto_collapse_milestones: "autoCollapseMilestones",
	};

	private parseConfig(content: string): { config: BacklogConfig; raw: Record<string, unknown> } {
		const raw = parseYaml(content) as Record<string, unknown>;
		const config: Partial<BacklogConfig> = {};

		for (const key of Object.keys(raw)) {
			if (key === "dod_defaults" || key === "definition_of_done" || this.snakeToCamel[key]) continue;
			if (!KNOWN_CONFIG_KEYS.includes(key)) {
				console.warn(`Config: unknown key "${key}" — ignoring`);
			}
		}

		// Handle dod_defaults as legacy alias for definition_of_done
		if (raw.dod_defaults !== undefined && raw.definition_of_done === undefined) {
			raw.definition_of_done = raw.dod_defaults;
		}
		delete raw.dod_defaults;

		for (const [snakeKey, value] of Object.entries(raw)) {
			const camelKey = this.snakeToCamel[snakeKey];
			if (!camelKey) continue;

			if (camelKey === "prefixesTask") {
				config.prefixes = { task: String(value) };
			} else if (camelKey === "backlogDirectory") {
				config.backlogDirectory = String(value);
			} else if (camelKey === "onStatusChange") {
				config.onStatusChange = String(value);
			} else {
				(config as Record<string, unknown>)[camelKey] = value;
			}
		}

		if (raw.definition_of_done !== undefined) {
			if (config.definitionOfDone == null) {
				config.definitionOfDone = [];
			} else {
				config.definitionOfDone = this.normalizeDefinitionOfDone(config.definitionOfDone);
			}
		}

		return {
			config: {
				projectName: (config.projectName as string) || "",
				defaultAssignee: config.defaultAssignee as string | undefined,
				defaultReporter: config.defaultReporter as string | undefined,
				statuses: (config.statuses as string[]) || [...DEFAULT_STATUSES],
				newStatuses: config.newStatuses as string[] | undefined,
				runningStatuses: config.runningStatuses as string[] | undefined,
				terminalStatuses: config.terminalStatuses as string[] | undefined,
				blockedStatuses: config.blockedStatuses as string[] | undefined,
				labels: (config.labels as Array<string | LabelConfig>) || [],
				authors: config.authors as Array<string | { name: string; color?: string }> | undefined,
				definitionOfDone: config.definitionOfDone as string[] | undefined,
				defaultStatus: config.defaultStatus as string | undefined,
				maxColumnWidth: config.maxColumnWidth as number | undefined,
				defaultEditor: config.defaultEditor as string | undefined,
				autoOpenBrowser: config.autoOpenBrowser as boolean | undefined,
				defaultPort: config.defaultPort as number | undefined,
				remoteOperations: config.remoteOperations as boolean | undefined,
				autoCommit: config.autoCommit as boolean | undefined,
				filesystemOnly: config.filesystemOnly as boolean | undefined,
				zeroPaddedIds: config.zeroPaddedIds as number | undefined,
				bypassGitHooks: config.bypassGitHooks as boolean | undefined,
				checkActiveBranches: config.checkActiveBranches as boolean | undefined,
				activeBranchDays: config.activeBranchDays as number | undefined,
				onStatusChange: config.onStatusChange as string | undefined,
				prefixes: config.prefixes as { task: string } | undefined,
				backlogDirectory: config.backlogDirectory as string | undefined,
				autoCollapseMilestones: config.autoCollapseMilestones as boolean | undefined,
			},
			raw,
		};
	}

	private configToRaw(config: BacklogConfig): Record<string, unknown> {
		const camelToSnake: Record<string, string> = {
			projectName: "project_name",
			defaultAssignee: "default_assignee",
			defaultReporter: "default_reporter",
			defaultStatus: "default_status",
			statuses: "statuses",
			newStatuses: "new_statuses",
			runningStatuses: "running_statuses",
			terminalStatuses: "terminal_statuses",
			blockedStatuses: "blocked_statuses",
			labels: "labels",
			authors: "authors",
			definitionOfDone: "definition_of_done",
			maxColumnWidth: "max_column_width",
			defaultEditor: "default_editor",
			autoOpenBrowser: "auto_open_browser",
			defaultPort: "default_port",
			remoteOperations: "remote_operations",
			autoCommit: "auto_commit",
			filesystemOnly: "filesystem_only",
			zeroPaddedIds: "zero_padded_ids",
			bypassGitHooks: "bypass_git_hooks",
			checkActiveBranches: "check_active_branches",
			activeBranchDays: "active_branch_days",
			onStatusChange: "on_status_change",
			autoCollapseMilestones: "auto_collapse_milestones",
			backlogDirectory: "backlog_directory",
		};

		const raw: Record<string, unknown> = {};

		for (const [camelKey, snakeKey] of Object.entries(camelToSnake)) {
			const value = (config as unknown as Record<string, unknown>)[camelKey];
			// Skip undefined optional fields
			if (value === undefined) continue;
			raw[snakeKey] = value;
		}

		// Handle prefixes.task → task_prefix
		if (config.prefixes?.task) {
			raw.task_prefix = config.prefixes.task;
		}

		return raw;
	}

	private serializeConfig(raw: Record<string, unknown>): string {
		const doc = new YamlDocument(raw);
		// Force flow style for all sequences (inline arrays)
		visit(doc, (_key, node, _path) => {
			if (isSeq(node)) {
				node.flow = true;
			}
		});
		return doc.toString({ lineWidth: 80 });
	}

	private normalizeDefinitionOfDone(definitionOfDone: unknown): string[] | undefined {
		if (!Array.isArray(definitionOfDone)) {
			return undefined;
		}

		return definitionOfDone
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
}
