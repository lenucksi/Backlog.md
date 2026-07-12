import { rename as moveFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_STATUSES } from "../constants/index.ts";
import { FileSystem } from "../file-system/operations.ts";
import { GitOperations } from "../git/operations.ts";
import {
	type AcceptanceCriterion,
	type BacklogConfig,
	type BulkOperationResult,
	type Decision,
	type Document,
	type DocumentCreateInput,
	type DocumentUpdateInput,
	EntityType,
	isLocalEditableTask,
	type Milestone,
	type SearchFilters,
	type Sequence,
	type Task,
	type TaskCreateInput,
	type TaskFilterSpec,
	type TaskListFilter,
	type TaskUpdateInput,
} from "../types/index.ts";
import { normalizeAssignee } from "../utils/assignee.ts";
import { documentIdsEqual, normalizeDocumentId } from "../utils/document-id.ts";
import {
	getDocumentSubPathFromRelativePath,
	normalizeDocumentRelativePath,
	normalizeDocumentSubPath,
} from "../utils/document-path.ts";
import { openInEditor } from "../utils/editor.ts";
import { generateNextDocId } from "../utils/id-generators.ts";
import {
	createMilestoneFilterValueResolver,
	normalizeMilestoneFilterValue,
	resolveClosestMilestoneFilterValue,
} from "../utils/milestone-filter.ts";
import { matchesModifiedFileFilters, normalizeModifiedFileFilters } from "../utils/modified-files.ts";
import { extractAnyPrefix, normalizeId } from "../utils/prefix-config.ts";
import {
	getCanonicalStatus as resolveCanonicalStatus,
	getValidStatuses as resolveValidStatuses,
} from "../utils/status.ts";
import { normalizeStringList, stringArraysEqual } from "../utils/task-builders.ts";
import { getTaskFilename, getTaskPath, normalizeTaskId, taskIdsEqual } from "../utils/task-path.ts";
import { attachSubtaskSummaries } from "../utils/task-subtasks.ts";
import { upsertTaskUpdatedDate } from "../utils/task-updated-date.ts";
import { isTerminalStatus } from "../utils/terminal-status.ts";
import { migrateConfig, needsMigration } from "./config-migration.ts";
import { ContentStore } from "./content-store.ts";
import * as idGen from "./id-generator.ts";
import { migrateDraftPrefixes, needsDraftPrefixMigration } from "./prefix-migration.ts";
import { calculateNewOrdinal, DEFAULT_ORDINAL_STEP, resolveOrdinalConflicts } from "./reorder.ts";
import { SearchService } from "./search-service.ts";
import { computeSequences, planMoveToSequence, planMoveToUnsequenced } from "./sequences.ts";
import {
	buildLatestStateMap,
	filterTasksByStateSnapshots,
	filterTasksWithCompleted,
	getFilterValue,
	mergeTaskArray,
	normalizeDocumentTypeInput,
} from "./task-input-resolvers.ts";
import {
	type BranchTaskStateEntry,
	findTaskInLocalBranches,
	findTaskInRemoteBranches,
	getTaskLoadingMessage,
	loadLocalBranchTasks,
	loadRemoteTasks,
} from "./task-loader.ts";
import * as taskOps from "./task-operations.ts";

interface BlessedScreen {
	program: {
		disableMouse(): void;
		enableMouse(): void;
		hideCursor(): void;
		showCursor(): void;
		input: NodeJS.EventEmitter;
		pause?: () => (() => void) | undefined;
		flush?: () => void;
		put?: {
			keypad_local?: () => void;
			keypad_xmit?: () => void;
		};
	};
	leave(): void;
	enter(): void;
	render(): void;
	clearRegion(x1: number, x2: number, y1: number, y2: number): void;
	width: number;
	height: number;
	emit(event: string): void;
}

interface TaskQueryOptions {
	filters?: TaskListFilter;
	query?: string;
	limit?: number;
	includeCrossBranch?: boolean;
}

export type TuiTaskEditFailureReason = "not_found" | "read_only" | "editor_failed";

export interface TuiTaskEditResult {
	changed: boolean;
	task?: Task;
	reason?: TuiTaskEditFailureReason;
}

export class Core {
	private _filesystem: FileSystem;
	public git: GitOperations;
	private contentStore?: ContentStore;
	private searchService?: SearchService;
	private readonly enableWatchers: boolean;
	private _config: BacklogConfig | null = null;

	get config(): BacklogConfig | null {
		return this._config;
	}

	constructor(projectRoot: string, options?: { enableWatchers?: boolean }) {
		this._filesystem = new FileSystem(projectRoot);
		this.git = new GitOperations(projectRoot, null, () => this._filesystem.loadConfig());
		// Disable watchers by default for CLI commands (non-interactive)
		// Interactive modes (TUI, browser, MCP) should explicitly pass enableWatchers: true
		this.enableWatchers = options?.enableWatchers ?? false;
		// Note: Config is loaded lazily when needed since constructor can't be async
	}

	async withCreateLock<T>(fn: () => Promise<T>): Promise<T> {
		return await this._filesystem.withCreateLock(fn);
	}

	async getContentStore(): Promise<ContentStore> {
		if (!this.contentStore) {
			// Use loadTasks as the task loader to include cross-branch tasks
			this.contentStore = new ContentStore(this._filesystem, () => this.loadTasks(), this.enableWatchers);
		}
		await this.contentStore.ensureInitialized();
		return this.contentStore;
	}

	async getSearchService(): Promise<SearchService> {
		if (!this.searchService) {
			const store = await this.getContentStore();
			this.searchService = new SearchService(store);
		}
		await this.searchService.ensureInitialized();
		return this.searchService;
	}

	private applyTaskFilters(
		tasks: Task[],
		filters?: TaskFilterSpec,
		resolveMilestoneFilterValue?: (milestoneValue: string) => string,
	): Task[] {
		if (!filters) {
			return tasks;
		}
		let result = tasks;

		const statusValue = getFilterValue(filters.status);
		if (statusValue) {
			const statusLower = statusValue.toLowerCase();
			result = result.filter((task) => (task.status ?? "").toLowerCase() === statusLower);
		}
		if (filters.assignee) {
			const assigneeLower = getFilterValue(filters.assignee)?.toLowerCase();
			if (assigneeLower) {
				result = result.filter((task) => (task.assignee ?? []).some((value) => value.toLowerCase() === assigneeLower));
			}
		}
		if (filters.priority) {
			const priorityLower = getFilterValue(filters.priority)?.toLowerCase();
			if (priorityLower) {
				result = result.filter((task) => (task.priority ?? "").toLowerCase() === priorityLower);
			}
		}
		if (filters.milestone) {
			const milestoneFilter = resolveClosestMilestoneFilterValue(
				filters.milestone,
				result.map((task) => resolveMilestoneFilterValue?.(task.milestone ?? "") ?? task.milestone ?? ""),
			);
			result = result.filter(
				(task) =>
					normalizeMilestoneFilterValue(resolveMilestoneFilterValue?.(task.milestone ?? "") ?? task.milestone ?? "") ===
					milestoneFilter,
			);
		}
		if (filters.parentTaskId) {
			const parentFilter = filters.parentTaskId;
			result = result.filter((task) => task.parentTaskId && taskIdsEqual(parentFilter, task.parentTaskId));
		}
		if (filters.labels && filters.labels.length > 0) {
			const requiredLabels = filters.labels.map((label) => label.toLowerCase()).filter(Boolean);
			if (requiredLabels.length > 0) {
				result = result.filter((task) => {
					const taskLabels = task.labels?.map((label) => label.toLowerCase()) || [];
					if (taskLabels.length === 0) return false;
					const labelSet = new Set(taskLabels);
					return requiredLabels.some((label) => labelSet.has(label));
				});
			}
		}
		if (filters.modifiedFiles && filters.modifiedFiles.length > 0) {
			const normalized = normalizeModifiedFileFilters(filters.modifiedFiles);
			if (normalized) {
				result = result.filter((task) => matchesModifiedFileFilters(task.modifiedFiles, normalized));
			}
		}
		return result;
	}

	private filterLocalEditableTasks(tasks: Task[]): Task[] {
		return tasks.filter(isLocalEditableTask);
	}

	private async requireCanonicalStatus(status: string): Promise<string> {
		const canonical = await resolveCanonicalStatus(status, this);
		if (canonical) {
			return canonical;
		}
		const validStatuses = await resolveValidStatuses(this);
		throw new Error(`Invalid status: ${status}. Valid statuses are: ${validStatuses.join(", ")}`);
	}

	private normalizePriority(value: string | undefined): ("high" | "medium" | "low") | undefined {
		if (value === undefined || value === "") {
			return undefined;
		}
		const normalized = value.toLowerCase();
		const allowed = ["high", "medium", "low"] as const;
		if (!allowed.includes(normalized as (typeof allowed)[number])) {
			throw new Error(`Invalid priority: ${value}. Valid values are: high, medium, low`);
		}
		return normalized as "high" | "medium" | "low";
	}

	private isExactTaskReference(reference: string, taskId: string): boolean {
		const trimmed = reference.trim();
		if (!trimmed) {
			return false;
		}
		const taskPrefix = extractAnyPrefix(taskId);
		const referencePrefix = extractAnyPrefix(trimmed);
		if (!taskPrefix || !referencePrefix) {
			return false;
		}
		if (taskPrefix.toLowerCase() !== referencePrefix.toLowerCase()) {
			return false;
		}
		return normalizeTaskId(trimmed, taskPrefix).toLowerCase() === normalizeTaskId(taskId, taskPrefix).toLowerCase();
	}

	private sanitizeArchivedTaskLinks(tasks: Task[], archivedTaskId: string): Task[] {
		const changedTasks: Task[] = [];

		for (const task of tasks) {
			const dependencies = task.dependencies ?? [];
			const references = task.references ?? [];

			const sanitizedDependencies = dependencies.filter((dependency) => !taskIdsEqual(dependency, archivedTaskId));
			const sanitizedReferences = references.filter(
				(reference) => !this.isExactTaskReference(reference, archivedTaskId),
			);

			const dependenciesChanged = !stringArraysEqual(dependencies, sanitizedDependencies);
			const referencesChanged = !stringArraysEqual(references, sanitizedReferences);
			if (!dependenciesChanged && !referencesChanged) {
				continue;
			}

			changedTasks.push({
				...task,
				dependencies: sanitizedDependencies,
				references: sanitizedReferences,
			});
		}

		return changedTasks;
	}

	async queryTasks(options: TaskQueryOptions = {}): Promise<Task[]> {
		const { filters, query, limit } = options;
		const trimmedQuery = query?.trim();
		const includeCrossBranch = options.includeCrossBranch ?? true;
		const milestoneResolverPromise = filters?.milestone
			? Promise.all([this._filesystem.listMilestones(), this._filesystem.listArchivedMilestones()]).then(
					([activeMilestones, archivedMilestones]) =>
						createMilestoneFilterValueResolver([...activeMilestones, ...archivedMilestones]),
				)
			: undefined;

		const applyFiltersAndLimit = async (collection: Task[]): Promise<Task[]> => {
			const resolveMilestoneFilterValue = milestoneResolverPromise ? await milestoneResolverPromise : undefined;
			let filtered = this.applyTaskFilters(collection, filters, resolveMilestoneFilterValue);
			if (!includeCrossBranch) {
				filtered = this.filterLocalEditableTasks(filtered);
			}
			if (typeof limit === "number" && limit >= 0) {
				return filtered.slice(0, limit);
			}
			return filtered;
		};

		if (!trimmedQuery) {
			const store = await this.getContentStore();
			const tasks = store.getTasks();
			return await applyFiltersAndLimit(tasks);
		}

		const searchService = await this.getSearchService();
		const searchFilters: SearchFilters = {};
		if (filters?.status) {
			searchFilters.status = filters.status;
		}
		if (filters?.priority) {
			searchFilters.priority = filters.priority;
		}
		if (filters?.assignee) {
			searchFilters.assignee = filters.assignee;
		}
		if (filters?.labels) {
			searchFilters.labels = filters.labels;
		}

		const searchResults = searchService.search({
			query: trimmedQuery,
			limit,
			types: ["task"],
			filters: Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
		});

		const seen = new Set<string>();
		const tasks: Task[] = [];
		for (const result of searchResults) {
			if (result.type !== "task") continue;
			const task = result.task;
			if (seen.has(task.id)) continue;
			seen.add(task.id);
			tasks.push(task);
		}

		return await applyFiltersAndLimit(tasks);
	}

	async getTask(taskId: string): Promise<Task | null> {
		const store = await this.getContentStore();
		const tasks = store.getTasks();
		const match = tasks.find((task) => taskIdsEqual(taskId, task.id));
		if (match) {
			return match;
		}

		// Pass raw ID to loadTask - it will handle prefix detection via getTaskPath
		return await this._filesystem.loadTask(taskId);
	}

	async getTaskWithSubtasks(taskId: string, localTasks?: Task[]): Promise<Task | null> {
		const task = await this.loadTaskById(taskId);
		if (!task) {
			return null;
		}

		const tasks = localTasks ?? (await this._filesystem.listTasks());
		return attachSubtaskSummaries(task, tasks);
	}

	async loadTaskById(taskId: string): Promise<Task | null> {
		// Pass raw ID to loadTask - it will handle prefix detection via getTaskPath
		const localTask = await this._filesystem.loadTask(taskId);
		if (localTask) return localTask;

		const config = await this._filesystem.loadConfig();
		if (config?.checkActiveBranches === false) return null;

		const sinceDays = config?.activeBranchDays ?? 30;
		const taskPrefix = config?.prefixes?.task ?? "task";

		// For cross-branch search, normalize with configured prefix
		const canonicalId = normalizeTaskId(taskId, taskPrefix);

		// Try other local branches first (faster than remote)
		const localBranchTask = await findTaskInLocalBranches(
			this.git,
			canonicalId,
			await this.getBacklogDirectoryName(),
			sinceDays,
			taskPrefix,
		);
		if (localBranchTask) return localBranchTask;

		// Skip remote if disabled
		if (config?.remoteOperations === false) return null;

		// Try remote branches
		return await findTaskInRemoteBranches(
			this.git,
			canonicalId,
			await this.getBacklogDirectoryName(),
			sinceDays,
			taskPrefix,
		);
	}

	async getTaskContent(taskId: string): Promise<string | null> {
		const filePath = await getTaskPath(taskId, this);
		if (!filePath) return null;
		return await Bun.file(filePath).text();
	}

	async getDocument(documentId: string): Promise<Document | null> {
		const documents = await this._filesystem.listDocuments();
		const match = documents.find((doc) => documentIdsEqual(documentId, doc.id));
		return match ?? null;
	}

	async getDocumentContent(documentId: string): Promise<string | null> {
		const document = await this.getDocument(documentId);
		if (!document) return null;

		const relativePath = normalizeDocumentRelativePath(document.path ?? `${document.id}.md`);
		const filePath = join(this._filesystem.docsDir, ...relativePath.split("/"));
		try {
			return await Bun.file(filePath).text();
		} catch {
			return null;
		}
	}

	reinitializeProjectRoot(projectRoot: string): void {
		this.disposeSearchService();
		this.disposeContentStore();
		this._filesystem = new FileSystem(projectRoot);
		this.git = new GitOperations(projectRoot, null, () => this._filesystem.loadConfig());
	}

	disposeSearchService(): void {
		if (this.searchService) {
			this.searchService.dispose();
			this.searchService = undefined;
		}
	}

	disposeContentStore(): void {
		if (this.contentStore) {
			this.contentStore.dispose();
			this.contentStore = undefined;
		}
	}

	// Backward compatibility aliases
	get filesystem() {
		return this._filesystem;
	}
	get gitOps() {
		return this.git;
	}

	async ensureConfigLoaded(): Promise<void> {
		try {
			const config = await this._filesystem.loadConfig();
			this._config = config;
			this.git.setConfig(config);
		} catch (error) {
			// Config loading failed, git operations will work with null config
			this._config = null;
			if (process.env.DEBUG) {
				console.warn(
					"Failed to load config for git operations:",
					error instanceof Error ? error.message : String(error),
				);
			}
		}
	}

	private async getBacklogDirectoryName(): Promise<string> {
		return this._filesystem.backlogDirName;
	}

	private async stageAndCommit(message: string, autoCommit?: boolean): Promise<void> {
		if (!(await this.shouldAutoCommit(autoCommit))) return;
		const backlogDir = await this.getBacklogDirectoryName();
		const repoRoot = await this.git.stageBacklogDirectory(backlogDir);
		await this.git.commitChanges(message, repoRoot);
	}

	private async requireTask(taskId: string): Promise<Task> {
		const task = await this._filesystem.loadTask(taskId);
		if (!task) throw new Error(`Task not found: ${taskId}`);
		return task;
	}

	async shouldAutoCommit(overrideValue?: boolean): Promise<boolean> {
		const config = await this._filesystem.loadConfig();
		this.git.setConfig(config);
		if (config?.filesystemOnly) {
			return false;
		}
		if (overrideValue !== undefined) {
			return overrideValue;
		}
		return config?.autoCommit ?? false;
	}

	private buildTaskOpDeps(): taskOps.TaskOpDeps {
		return {
			filesystem: this._filesystem,
			contentStore: this.contentStore,
			git: this.git,
			idGenerator: { generateNextId: (type, parent) => this.generateNextId(type, parent) },
			requireCanonicalStatus: (s) => this.requireCanonicalStatus(s),
			normalizePriority: (v) => this.normalizePriority(v),
			shouldAutoCommit: (v) => this.shouldAutoCommit(v),
			getBacklogDirectoryName: () => this.getBacklogDirectoryName(),
			withCreateLock: <T>(fn: () => Promise<T>) => this.withCreateLock(fn),
			queryTasks: (opts) => this.queryTasks(opts),
			demoteTaskWithUpdates: (t, i, a) => this.demoteTaskWithUpdates(t, i, a),
			promoteDraftWithUpdates: (d, i, a) => this.promoteDraftWithUpdates(d, i, a),
			updateDraftFromInput: (id, i, a) => this.updateDraftFromInput(id, i, a),
		};
	}

	async getGitOps() {
		await this.ensureConfigLoaded();
		return this.git;
	}

	// Config migration
	private parseLegacyInlineArray(value: string): string[] {
		const items: string[] = [];
		let current = "";
		let quote: '"' | "'" | null = null;

		const pushCurrent = () => {
			const normalized = current.trim().replace(/\\(['"])/g, "$1");
			if (normalized) {
				items.push(normalized);
			}
			current = "";
		};

		for (let i = 0; i < value.length; i += 1) {
			const ch = value[i];
			const prev = i > 0 ? value[i - 1] : "";
			if (quote) {
				if (ch === quote && prev !== "\\") {
					quote = null;
					continue;
				}
				current += ch;
				continue;
			}
			if (ch === '"' || ch === "'") {
				quote = ch;
				continue;
			}
			if (ch === ",") {
				pushCurrent();
				continue;
			}
			current += ch;
		}
		pushCurrent();
		return items;
	}

	private stripYamlComment(value: string): string {
		let quote: '"' | "'" | null = null;
		for (let i = 0; i < value.length; i += 1) {
			const ch = value[i];
			const prev = i > 0 ? value[i - 1] : "";
			if (quote) {
				if (ch === quote && prev !== "\\") {
					quote = null;
				}
				continue;
			}
			if (ch === '"' || ch === "'") {
				quote = ch;
				continue;
			}
			if (ch === "#") {
				return value.slice(0, i).trimEnd();
			}
		}
		return value;
	}

	private parseLegacyYamlValue(value: string): string {
		const trimmed = this.stripYamlComment(value).trim();
		const singleQuoted = trimmed.match(/^'(.*)'$/);
		if (singleQuoted?.[1] !== undefined) {
			return singleQuoted[1].replace(/''/g, "'");
		}
		const doubleQuoted = trimmed.match(/^"(.*)"$/);
		if (doubleQuoted?.[1] !== undefined) {
			return doubleQuoted[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
		}
		return trimmed;
	}

	private async extractLegacyConfigMilestones(): Promise<string[]> {
		try {
			const configPath = this._filesystem.configFilePath;
			const content = await Bun.file(configPath).text();
			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i += 1) {
				const line = lines[i] ?? "";
				const match = line.match(/^(\s*)milestones\s*:\s*(.*)$/);
				if (!match) {
					continue;
				}

				const milestoneIndent = (match[1] ?? "").length;
				const trailing = this.stripYamlComment(match[2] ?? "").trim();
				if (trailing.startsWith("[")) {
					let combined = trailing;
					let closed = trailing.endsWith("]");
					let j = i + 1;
					while (!closed && j < lines.length) {
						const segment = this.stripYamlComment(lines[j] ?? "").trim();
						combined += segment;
						if (segment.includes("]")) {
							closed = true;
							break;
						}
						j += 1;
					}
					if (closed) {
						const openIndex = combined.indexOf("[");
						const closeIndex = combined.lastIndexOf("]");
						if (openIndex !== -1 && closeIndex > openIndex) {
							const parsed = this.parseLegacyInlineArray(combined.slice(openIndex + 1, closeIndex));
							return parsed.map((item) => this.parseLegacyYamlValue(item)).filter(Boolean);
						}
					}
				}
				if (trailing.length > 0) {
					const single = this.parseLegacyYamlValue(trailing);
					return single ? [single] : [];
				}

				const values: string[] = [];
				for (let j = i + 1; j < lines.length; j += 1) {
					const nextLine = lines[j] ?? "";
					if (!nextLine.trim()) {
						continue;
					}
					const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;
					if (nextIndent <= milestoneIndent) {
						break;
					}
					const trimmed = nextLine.trim();
					if (!trimmed.startsWith("-")) {
						continue;
					}
					const itemValue = this.parseLegacyYamlValue(trimmed.slice(1));
					if (itemValue) {
						values.push(itemValue);
					}
				}
				return values;
			}
			return [];
		} catch {
			return [];
		}
	}

	private async migrateLegacyConfigMilestonesToFiles(legacyMilestones: string[]): Promise<void> {
		if (legacyMilestones.length === 0) {
			return;
		}
		const existingMilestones = await this._filesystem.listMilestones();
		const existingKeys = new Set<string>();
		for (const milestone of existingMilestones) {
			const idKey = milestone.id.trim().toLowerCase();
			const titleKey = milestone.title.trim().toLowerCase();
			if (idKey) {
				existingKeys.add(idKey);
			}
			if (titleKey) {
				existingKeys.add(titleKey);
			}
		}
		for (const name of legacyMilestones) {
			const normalized = name.trim();
			const key = normalized.toLowerCase();
			if (!normalized || existingKeys.has(key)) {
				continue;
			}
			const created = await this._filesystem.createMilestone(normalized);
			const createdIdKey = created.id.trim().toLowerCase();
			const createdTitleKey = created.title.trim().toLowerCase();
			if (createdIdKey) {
				existingKeys.add(createdIdKey);
			}
			if (createdTitleKey) {
				existingKeys.add(createdTitleKey);
			}
		}
	}

	async ensureConfigMigrated(): Promise<void> {
		await this.ensureConfigLoaded();
		const legacyMilestones = await this.extractLegacyConfigMilestones();
		let config = await this._filesystem.loadConfig();
		const needsSchemaMigration = !config || needsMigration(config);

		if (needsSchemaMigration) {
			config = migrateConfig(config || {});
		}
		if (legacyMilestones.length > 0) {
			await this.migrateLegacyConfigMilestonesToFiles(legacyMilestones);
		}
		if (config && (needsSchemaMigration || legacyMilestones.length > 0)) {
			// Rewrite config to apply schema defaults and strip legacy milestones key after successful migration.
			await this._filesystem.saveConfig(config);
		}

		// Run draft prefix migration if needed (one-time migration)
		// This renames task-*.md files in drafts/ to draft-*.md
		if (needsDraftPrefixMigration(config)) {
			await migrateDraftPrefixes(this.filesystem);
		}
	}

	// ID generation
	/**
	 * Generates the next ID for a given entity type.
	 *
	 * @param type - The entity type (Task, Draft, Document, Decision). Defaults to Task.
	 * @param parent - Optional parent ID for subtask generation (only applicable for tasks).
	 * @returns The next available ID (e.g., "task-42", "draft-5", "doc-3")
	 *
	 * Folder scanning by type:
	 * - Task: /tasks, /completed, cross-branch (if enabled), remote (if enabled)
	 * - Draft: /drafts only
	 * - Document: /documents only
	 * - Decision: /decisions only
	 */
	async generateNextId(type: EntityType = EntityType.Task, parent?: string): Promise<string> {
		return idGen.generateNextId(
			{
				filesystem: this._filesystem,
				git: this.git,
				getBacklogDirectoryName: () => this.getBacklogDirectoryName(),
				listTasksWithMetadata: () => this.listTasksWithMetadata(),
			},
			type,
			parent,
		);
	}

	private async applyTaskUpdateInput(
		task: Task,
		input: TaskUpdateInput,
		statusResolver: (status: string) => Promise<string>,
	): Promise<{ task: Task; mutated: boolean }> {
		return taskOps.applyTaskUpdateInput(this.buildTaskOpDeps(), task, input, statusResolver);
	}

	async createTaskFromInput(input: TaskCreateInput, autoCommit?: boolean): Promise<{ task: Task; filePath?: string }> {
		return taskOps.createTaskFromInput(this.buildTaskOpDeps(), input, autoCommit);
	}

	async createTask(task: Task, autoCommit?: boolean): Promise<string> {
		return taskOps.createTask(this.buildTaskOpDeps(), task, autoCommit);
	}

	async updateTask(task: Task, autoCommit?: boolean): Promise<void> {
		return taskOps.updateTask(this.buildTaskOpDeps(), task, autoCommit);
	}

	async updateTaskFromInput(taskId: string, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task> {
		return taskOps.updateTaskFromInput(this.buildTaskOpDeps(), taskId, input, autoCommit);
	}

	async updateDraft(task: Task, autoCommit?: boolean): Promise<void> {
		// Drafts always keep status Draft
		task.status = "Draft";
		normalizeAssignee(task);
		task.updatedDate = taskOps.formatDateStamp();

		const filepath = await this._filesystem.saveDraft(task);

		if (await this.shouldAutoCommit(autoCommit)) {
			await this.git.addFile(filepath);
			await this.git.commitTaskChange(task.id, `Update draft ${task.id}`, filepath);
		}
	}

	async updateDraftFromInput(draftId: string, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task> {
		const draft = await this._filesystem.loadDraft(draftId);
		if (!draft) {
			throw new Error(`Draft not found: ${draftId}`);
		}

		const { mutated } = await this.applyTaskUpdateInput(draft, input, async (status) => {
			if (status.trim().toLowerCase() !== "draft") {
				throw new Error("Drafts must use status Draft.");
			}
			return "Draft";
		});

		if (!mutated) {
			return draft;
		}

		await this.updateDraft(draft, autoCommit);
		const refreshed = await this._filesystem.loadDraft(draftId);
		return refreshed ?? draft;
	}

	async editTaskOrDraft(taskId: string, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task> {
		return taskOps.editTaskOrDraft(this.buildTaskOpDeps(), taskId, input, autoCommit);
	}

	private async promoteDraftWithUpdates(draft: Task, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task> {
		const targetStatus = input.status?.trim();
		if (!targetStatus || targetStatus.toLowerCase() === "draft") {
			throw new Error("Promoting a draft requires a non-draft status.");
		}

		const { mutated } = await this.applyTaskUpdateInput(draft, { ...input, status: undefined }, async (status) => {
			if (status.trim().toLowerCase() !== "draft") {
				throw new Error("Drafts must use status Draft.");
			}
			return "Draft";
		});

		const canonicalStatus = await this.requireCanonicalStatus(targetStatus);

		const { promotedTask, savedPath } = await this.withCreateLock(async () => {
			const newTaskId = await this.generateNextId(EntityType.Task, draft.parentTaskId);
			const draftPath = draft.filePath;

			const promotedTask: Task = {
				...draft,
				id: newTaskId,
				status: canonicalStatus,
				filePath: undefined,
				...(mutated || draft.status !== canonicalStatus ? { updatedDate: taskOps.formatDateStamp() } : {}),
			};

			normalizeAssignee(promotedTask);
			const savedPath = await this._filesystem.saveTask(promotedTask);

			if (draftPath) {
				await unlink(draftPath);
			}

			return { promotedTask, savedPath };
		});

		const savedTask = await this._filesystem.loadTask(promotedTask.id);
		if (this.contentStore && savedTask) {
			this.contentStore.upsertTask(savedTask);
		}

		await this.stageAndCommit(`backlog: Promote draft ${normalizeId(draft.id, "draft")}`, autoCommit);

		return savedTask ?? { ...promotedTask, filePath: savedPath };
	}

	private async demoteTaskWithUpdates(task: Task, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task> {
		const { mutated } = await this.applyTaskUpdateInput(task, { ...input, status: undefined }, async (status) => {
			if (status.trim().toLowerCase() === "draft") {
				return "Draft";
			}
			return this.requireCanonicalStatus(status);
		});

		const { demotedDraft, savedPath } = await this.withCreateLock(async () => {
			const newDraftId = await this.generateNextId(EntityType.Draft);
			const taskPath = task.filePath;

			const demotedDraft: Task = {
				...task,
				id: newDraftId,
				status: "Draft",
				filePath: undefined,
				...(mutated || task.status !== "Draft" ? { updatedDate: taskOps.formatDateStamp() } : {}),
			};

			normalizeAssignee(demotedDraft);
			const savedPath = await this._filesystem.saveDraft(demotedDraft);

			if (taskPath) {
				await unlink(taskPath);
			}

			return { demotedDraft, savedPath };
		});

		await this.stageAndCommit(`backlog: Demote task ${normalizeTaskId(task.id)}`, autoCommit);

		return (await this._filesystem.loadDraft(demotedDraft.id)) ?? { ...demotedDraft, filePath: savedPath };
	}

	async editTask(taskId: string, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task> {
		return taskOps.editTask(this.buildTaskOpDeps(), taskId, input, autoCommit);
	}

	async updateTasksBulk(tasks: Task[], commitMessage?: string, autoCommit?: boolean): Promise<void> {
		for (const task of tasks) {
			await this.updateTask(task, false);
		}

		await this.stageAndCommit(commitMessage || `Update ${tasks.length} tasks`, autoCommit);
	}

	async reorderTask(params: {
		taskId: string;
		targetStatus: string;
		orderedTaskIds: string[];
		targetMilestone?: string | null;
		commitMessage?: string;
		autoCommit?: boolean;
		defaultStep?: number;
	}): Promise<{ updatedTask: Task; changedTasks: Task[] }> {
		const taskId = normalizeTaskId(String(params.taskId || "").trim());
		const targetStatus = String(params.targetStatus || "").trim();
		const orderedTaskIds = params.orderedTaskIds.map((id) => normalizeTaskId(String(id || "").trim())).filter(Boolean);
		const defaultStep = params.defaultStep ?? DEFAULT_ORDINAL_STEP;

		if (!taskId) throw new Error("taskId is required");
		if (!targetStatus) throw new Error("targetStatus is required");
		if (orderedTaskIds.length === 0) throw new Error("orderedTaskIds must include at least one task");
		if (!orderedTaskIds.includes(taskId)) {
			throw new Error("orderedTaskIds must include the task being moved");
		}

		const seen = new Set<string>();
		for (const id of orderedTaskIds) {
			if (seen.has(id)) {
				throw new Error(`Duplicate task id ${id} in orderedTaskIds`);
			}
			seen.add(id);
		}

		// Load all tasks from the ordered list - use getTask to include cross-branch tasks from the store
		const loadedTasks = await Promise.all(
			orderedTaskIds.map(async (id) => {
				const task = await this.getTask(id);
				return task;
			}),
		);

		// Filter out any tasks that couldn't be loaded (may have been moved/deleted)
		const validTasks = loadedTasks.filter((t): t is Task => t !== null);

		// Verify the moved task itself exists
		const movedTask = validTasks.find((t) => t.id === taskId);
		if (!movedTask) {
			throw new Error(`Task ${taskId} not found while reordering`);
		}

		// Reject reordering tasks from other branches - they can only be modified in their source branch
		if (movedTask.branch) {
			throw new Error(
				`Task ${taskId} exists in branch "${movedTask.branch}" and cannot be reordered from the current branch. Switch to that branch to modify it.`,
			);
		}

		const hasTargetMilestone = params.targetMilestone !== undefined;
		const normalizedTargetMilestone =
			params.targetMilestone === null
				? undefined
				: typeof params.targetMilestone === "string" && params.targetMilestone.trim().length > 0
					? params.targetMilestone.trim()
					: undefined;

		// Calculate target index within the valid tasks list
		const validOrderedIds = orderedTaskIds.filter((id) => validTasks.some((t) => t.id === id));
		const targetIndex = validOrderedIds.indexOf(taskId);

		if (targetIndex === -1) {
			throw new Error("Implementation error: Task found in validTasks but index missing");
		}

		const previousTask = targetIndex > 0 ? validTasks[targetIndex - 1] : null;
		const nextTask = targetIndex < validTasks.length - 1 ? validTasks[targetIndex + 1] : null;

		const { ordinal: newOrdinal, requiresRebalance } = calculateNewOrdinal({
			previous: previousTask,
			next: nextTask,
			defaultStep,
		});

		const updatedMoved: Task = {
			...movedTask,
			status: targetStatus,
			...(hasTargetMilestone ? { milestone: normalizedTargetMilestone } : {}),
			ordinal: newOrdinal,
		};

		const tasksInOrder: Task[] = validTasks.map((task, index) => (index === targetIndex ? updatedMoved : task));
		const resolutionUpdates = resolveOrdinalConflicts(tasksInOrder, {
			defaultStep,
			startOrdinal: defaultStep,
			forceSequential: requiresRebalance,
		});

		const updatesMap = new Map<string, Task>();
		for (const update of resolutionUpdates) {
			updatesMap.set(update.id, update);
		}
		if (!updatesMap.has(updatedMoved.id)) {
			updatesMap.set(updatedMoved.id, updatedMoved);
		}

		const originalMap = new Map(validTasks.map((task) => [task.id, task]));
		const changedTasks = Array.from(updatesMap.values()).filter((task) => {
			const original = originalMap.get(task.id);
			if (!original) return true;
			return (
				(original.ordinal ?? null) !== (task.ordinal ?? null) ||
				(original.status ?? "") !== (task.status ?? "") ||
				(original.milestone ?? "") !== (task.milestone ?? "")
			);
		});

		if (changedTasks.length > 0) {
			await this.updateTasksBulk(
				changedTasks,
				params.commitMessage ?? `Reorder tasks in ${targetStatus}`,
				params.autoCommit,
			);
		}

		const updatedTask = updatesMap.get(taskId) ?? updatedMoved;
		return { updatedTask, changedTasks };
	}

	// Sequences operations (business logic lives in core, not server)
	async listActiveSequences(): Promise<{ unsequenced: Task[]; sequences: Sequence[] }> {
		const all = await this._filesystem.listTasks();
		const config = await this._filesystem.loadConfig();
		const statuses = config?.statuses ?? [...DEFAULT_STATUSES];
		const active = all.filter((t) => !isTerminalStatus(t.status, statuses, config?.terminalStatuses));
		return computeSequences(active);
	}

	async moveTaskInSequences(params: {
		taskId: string;
		unsequenced?: boolean;
		targetSequenceIndex?: number;
	}): Promise<{ unsequenced: Task[]; sequences: Sequence[] }> {
		const taskId = String(params.taskId || "").trim();
		if (!taskId) throw new Error("taskId is required");

		const allTasks = await this._filesystem.listTasks();
		const exists = allTasks.some((t) => t.id === taskId);
		if (!exists) throw new Error(`Task ${taskId} not found`);

		const config = await this._filesystem.loadConfig();
		const statuses = config?.statuses ?? [...DEFAULT_STATUSES];
		const active = allTasks.filter((t) => !isTerminalStatus(t.status, statuses, config?.terminalStatuses));
		const { sequences } = computeSequences(active);

		if (params.unsequenced) {
			const res = planMoveToUnsequenced(allTasks, taskId);
			if (!res.ok) throw new Error(res.error);
			await this.updateTasksBulk(res.changed, `Move ${taskId} to Unsequenced`);
		} else {
			const targetSequenceIndex = params.targetSequenceIndex;
			if (targetSequenceIndex === undefined || Number.isNaN(targetSequenceIndex)) {
				throw new Error("targetSequenceIndex must be a number");
			}
			if (targetSequenceIndex < 1) throw new Error("targetSequenceIndex must be >= 1");
			const changed = planMoveToSequence(allTasks, sequences, taskId, targetSequenceIndex);
			if (changed.length > 0) await this.updateTasksBulk(changed, `Update deps/order for ${taskId}`);
		}

		const afterAll = await this._filesystem.listTasks();
		const afterActive = afterAll.filter((t) => !isTerminalStatus(t.status, statuses, config?.terminalStatuses));
		return computeSequences(afterActive);
	}

	async findBacklinks(
		entityId: string,
	): Promise<Array<{ type: "task" | "document" | "decision"; id: string; title: string; snippet: string }>> {
		const cleanId = entityId.replace(/^(task-|doc-|decision-)/, "");
		const results: Array<{ type: "task" | "document" | "decision"; id: string; title: string; snippet: string }> = [];
		const refRegex = new RegExp(
			`\\b(?:#)?(?:task-)?${cleanId}\\b|\\bdoc-${cleanId}\\b|\\bdecision-${cleanId}\\b`,
			"gi",
		);

		// Search tasks
		const tasks = await this._filesystem.listTasks();
		for (const task of tasks) {
			const searchFields = [task.title, task.description || "", task.rawContent || ""].join("\n");
			const match = refRegex.exec(searchFields);
			if (match) {
				const start = Math.max(0, match.index - 40);
				const end = Math.min(searchFields.length, match.index + match[0].length + 40);
				const snippet =
					(start > 0 ? "..." : "") +
					searchFields.slice(start, end).replace(/\n/g, " ") +
					(end < searchFields.length ? "..." : "");
				results.push({ type: "task", id: task.id, title: task.title, snippet });
			}
		}

		// Search documents
		const documents = await this._filesystem.listDocuments();
		for (const doc of documents) {
			const searchFields = [doc.title, doc.rawContent || ""].join("\n");
			const match = refRegex.exec(searchFields);
			if (match) {
				const start = Math.max(0, match.index - 40);
				const end = Math.min(searchFields.length, match.index + match[0].length + 40);
				const snippet =
					(start > 0 ? "..." : "") +
					searchFields.slice(start, end).replace(/\n/g, " ") +
					(end < searchFields.length ? "..." : "");
				results.push({ type: "document", id: doc.id, title: doc.title, snippet });
			}
		}

		// Search decisions
		const decisions = await this._filesystem.listDecisions();
		for (const decision of decisions) {
			const searchFields = [
				decision.title,
				decision.context || "",
				decision.decision || "",
				decision.consequences || "",
				decision.alternatives || "",
				decision.rawContent || "",
			].join("\n");
			const match = refRegex.exec(searchFields);
			if (match) {
				const start = Math.max(0, match.index - 40);
				const end = Math.min(searchFields.length, match.index + match[0].length + 40);
				const snippet =
					(start > 0 ? "..." : "") +
					searchFields.slice(start, end).replace(/\n/g, " ") +
					(end < searchFields.length ? "..." : "");
				results.push({ type: "decision", id: decision.id, title: decision.title, snippet });
			}
		}

		return results;
	}

	async archiveTask(taskId: string, autoCommit?: boolean): Promise<boolean> {
		const taskToArchive = await this._filesystem.loadTask(taskId);
		if (!taskToArchive) {
			return false;
		}
		// Stamp lifecycle dates before moving the file
		if (!taskToArchive.archivedDate) {
			const now = taskOps.formatDateStamp();
			taskToArchive.archivedDate = now;
			taskToArchive.updatedDate = now;
			await this._filesystem.saveTask(taskToArchive);
		}
		const normalizedTaskId = taskToArchive.id;

		const taskPath = taskToArchive.filePath ?? (await getTaskPath(normalizedTaskId, this));
		const taskFilename = await getTaskFilename(normalizedTaskId, this);

		if (!taskPath || !taskFilename) return false;

		const fromPath = taskPath;
		const toPath = join(await this._filesystem.getArchiveTasksDir(), taskFilename);

		const success = await this._filesystem.archiveTask(normalizedTaskId);
		if (!success) {
			return false;
		}

		const activeTasks = await this._filesystem.listTasks();
		const sanitizedTasks = this.sanitizeArchivedTaskLinks(activeTasks, normalizedTaskId);
		if (sanitizedTasks.length > 0) {
			await this.updateTasksBulk(sanitizedTasks, undefined, false);
		}

		if (await this.shouldAutoCommit(autoCommit)) {
			// Stage the file move for proper Git tracking
			const repoRoot = await this.git.stageFileMove(fromPath, toPath);
			for (const sanitizedTask of sanitizedTasks) {
				if (sanitizedTask.filePath) {
					await this.git.addFile(sanitizedTask.filePath);
				}
			}
			await this.git.commitChanges(`backlog: Archive task ${normalizedTaskId}`, repoRoot);
		}

		return true;
	}

	async archiveMilestone(
		identifier: string,
		autoCommit?: boolean,
	): Promise<{ success: boolean; sourcePath?: string; targetPath?: string; milestone?: Milestone }> {
		const result = await this._filesystem.archiveMilestone(identifier);

		if (result.success && result.sourcePath && result.targetPath && (await this.shouldAutoCommit(autoCommit))) {
			const repoRoot = await this.git.stageFileMove(result.sourcePath, result.targetPath);
			const label = result.milestone?.id ? ` ${result.milestone.id}` : "";
			const commitPaths = [result.sourcePath, result.targetPath];
			try {
				await this.git.commitFiles(`backlog: Archive milestone${label}`, commitPaths, repoRoot);
			} catch (error) {
				await this.git.resetPaths(commitPaths, repoRoot);
				try {
					await moveFile(result.targetPath, result.sourcePath);
				} catch {
					// Ignore rollback failure and propagate original commit error.
				}
				throw error;
			}
		}

		return {
			success: result.success,
			sourcePath: result.sourcePath,
			targetPath: result.targetPath,
			milestone: result.milestone,
		};
	}

	async renameMilestone(
		identifier: string,
		title: string,
		autoCommit?: boolean,
	): Promise<{
		success: boolean;
		sourcePath?: string;
		targetPath?: string;
		milestone?: Milestone;
		previousTitle?: string;
	}> {
		const result = await this._filesystem.renameMilestone(identifier, title);
		if (!result.success) {
			return result;
		}

		if (result.sourcePath && result.targetPath && (await this.shouldAutoCommit(autoCommit))) {
			const repoRoot = await this.git.stageFileMove(result.sourcePath, result.targetPath);
			const label = result.milestone?.id ? ` ${result.milestone.id}` : "";
			const commitPaths = [result.sourcePath, result.targetPath];
			try {
				await this.git.commitFiles(`backlog: Rename milestone${label}`, commitPaths, repoRoot);
			} catch (error) {
				await this.git.resetPaths(commitPaths, repoRoot);
				const rollbackTitle = result.previousTitle ?? title;
				try {
					await this._filesystem.renameMilestone(result.milestone?.id ?? identifier, rollbackTitle);
				} catch {
					// Ignore rollback failure and propagate original commit error.
				}
				throw error;
			}
		}

		return result;
	}

	async bulkArchive(ids: string[]): Promise<BulkOperationResult> {
		const succeeded: string[] = [];
		const failed: { id: string; error: string }[] = [];

		for (const rawId of ids) {
			const id = normalizeTaskId(rawId.trim());
			if (!id) {
				failed.push({ id: rawId, error: "Invalid task ID" });
				continue;
			}
			try {
				const ok = await this.archiveTask(id, false);
				if (ok) {
					succeeded.push(id);
				} else {
					failed.push({ id, error: "Task not found" });
				}
			} catch (error) {
				failed.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
			}
		}

		if (succeeded.length > 0) {
			const taskWord = succeeded.length === 1 ? "task" : "tasks";
			await this.stageAndCommit(`backlog: Archive ${succeeded.length} ${taskWord}`, undefined);
		}

		return { succeeded, failed };
	}

	async bulkUpdateTasks(
		ids: string[],
		fields: {
			status?: string;
			priority?: "high" | "medium" | "low";
			milestone?: string | null;
			dueDate?: string | null;
			labels?: string[];
			assignee?: string[];
		},
	): Promise<BulkOperationResult> {
		const succeeded: string[] = [];
		const failed: { id: string; error: string }[] = [];
		const tasksToUpdate: Task[] = [];

		for (const rawId of ids) {
			const id = normalizeTaskId(rawId.trim());
			if (!id) {
				failed.push({ id: rawId, error: "Invalid task ID" });
				continue;
			}
			try {
				const task = await this._filesystem.loadTask(id);
				if (!task) {
					failed.push({ id, error: "Task not found" });
					continue;
				}
				if (fields.status !== undefined) task.status = fields.status;
				if (fields.priority !== undefined) task.priority = fields.priority;
				if (fields.milestone !== undefined) task.milestone = fields.milestone ?? undefined;
				if (fields.dueDate !== undefined) task.dueDate = fields.dueDate ?? undefined;
				if (fields.labels !== undefined) task.labels = fields.labels;
				if (fields.assignee !== undefined) task.assignee = fields.assignee;
				task.updatedDate = taskOps.formatDateStamp();
				tasksToUpdate.push(task);
				succeeded.push(id);
			} catch (error) {
				failed.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
			}
		}

		if (tasksToUpdate.length > 0) {
			await this.updateTasksBulk(tasksToUpdate, `backlog: Bulk update ${tasksToUpdate.length} task(s)`);
		}

		return { succeeded, failed };
	}

	async getTerminalStatusTasksByAge(olderThanDays: number): Promise<Task[]> {
		const tasks = await this._filesystem.listTasks();
		const config = await this._filesystem.loadConfig();
		const statuses = config?.statuses ?? [...DEFAULT_STATUSES];
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		return tasks.filter((task) => {
			if (!isTerminalStatus(task.status, statuses)) return false;

			const taskDate = task.updatedDate || task.createdDate;
			if (!taskDate) return false;

			const date = new Date(taskDate);
			return date < cutoffDate;
		});
	}

	async archiveDraft(draftId: string, autoCommit?: boolean): Promise<boolean> {
		const success = await this._filesystem.archiveDraft(draftId);

		if (success) {
			await this.stageAndCommit(`backlog: Archive draft ${normalizeId(draftId, "draft")}`, autoCommit);
		}

		return success;
	}

	async promoteDraft(draftId: string, autoCommit?: boolean): Promise<boolean> {
		const success = await this._filesystem.promoteDraft(draftId);

		if (success) {
			await this.stageAndCommit(`backlog: Promote draft ${normalizeId(draftId, "draft")}`, autoCommit);
		}

		return success;
	}

	async demoteTask(taskId: string, autoCommit?: boolean): Promise<boolean> {
		const success = await this._filesystem.demoteTask(taskId);

		if (success) {
			await this.stageAndCommit(`backlog: Demote task ${normalizeTaskId(taskId)}`, autoCommit);
		}

		return success;
	}

	async addAcceptanceCriteria(taskId: string, criteria: string[], autoCommit?: boolean): Promise<void> {
		const task = await this.requireTask(taskId);
		const current = Array.isArray(task.acceptanceCriteriaItems) ? [...task.acceptanceCriteriaItems] : [];

		let nextIndex = current.length > 0 ? Math.max(...current.map((c) => c.index)) + 1 : 1;

		// Append new criteria
		const newCriteria = criteria.map((text) => ({ index: nextIndex++, text, checked: false }));
		task.acceptanceCriteriaItems = [...current, ...newCriteria];

		await this.updateTask(task, autoCommit);
	}

	async removeAcceptanceCriteria(taskId: string, indices: number[], autoCommit?: boolean): Promise<number[]> {
		const task = await this.requireTask(taskId);
		let list = Array.isArray(task.acceptanceCriteriaItems) ? [...task.acceptanceCriteriaItems] : [];
		const removed: number[] = [];

		// Sort indices in descending order to avoid index shifting issues
		const sortedIndices = [...indices].sort((a, b) => b - a);

		for (const idx of sortedIndices) {
			const before = list.length;
			list = list.filter((c) => c.index !== idx);
			if (list.length < before) {
				removed.push(idx);
			}
		}

		if (removed.length === 0) {
			throw new Error("No criteria were removed. Check that the specified indices exist.");
		}

		// Re-index remaining items (1-based)
		list = list.map((c, i) => ({ ...c, index: i + 1 }));
		task.acceptanceCriteriaItems = list;

		await this.updateTask(task, autoCommit);

		return removed.sort((a, b) => a - b);
	}

	// Silently ignores invalid indices; returns updated indices.
	async checkAcceptanceCriteria(
		taskId: string,
		indices: number[],
		checked: boolean,
		autoCommit?: boolean,
	): Promise<number[]> {
		const task = await this.requireTask(taskId);
		let list = Array.isArray(task.acceptanceCriteriaItems) ? [...task.acceptanceCriteriaItems] : [];
		const updated: number[] = [];

		// Filter to only valid indices and update them
		for (const idx of indices) {
			if (list.some((c) => c.index === idx)) {
				list = list.map((c) => {
					if (c.index === idx) {
						updated.push(idx);
						return { ...c, checked };
					}
					return c;
				});
			}
		}

		if (updated.length === 0) {
			throw new Error("No criteria were updated.");
		}

		task.acceptanceCriteriaItems = list;

		await this.updateTask(task, autoCommit);

		return updated.sort((a, b) => a - b);
	}

	async listAcceptanceCriteria(taskId: string): Promise<AcceptanceCriterion[]> {
		const task = await this.requireTask(taskId);
		return task.acceptanceCriteriaItems || [];
	}

	async createDecision(decision: Decision, autoCommit?: boolean): Promise<void> {
		await this._filesystem.saveDecision(decision);

		await this.stageAndCommit(`backlog: Add decision ${decision.id}`, autoCommit);
	}

	async editDecision(id: string, updates: { labels?: string[] }): Promise<void> {
		const existingDecision = await this._filesystem.loadDecision(id);
		if (!existingDecision) {
			throw new Error(`Decision ${id} not found`);
		}

		const updatedDecision: Decision = {
			...existingDecision,
			...(updates.labels !== undefined && { labels: updates.labels }),
		};

		await this.createDecision(updatedDecision);
	}

	async resolveDecision(decisionId: string, autoCommit?: boolean): Promise<Decision> {
		const existingDecision = await this._filesystem.loadDecision(decisionId);
		if (!existingDecision) {
			throw new Error(`Decision ${decisionId} not found`);
		}
		if (existingDecision.status === "superseded") {
			throw new Error(`Decision ${decisionId} is already superseded`);
		}

		existingDecision.status = "superseded";
		await this.createDecision(existingDecision, autoCommit);
		return existingDecision;
	}

	async updateDecisionFromContent(decisionId: string, content: string, autoCommit?: boolean): Promise<void> {
		const existingDecision = await this._filesystem.loadDecision(decisionId);
		if (!existingDecision) {
			throw new Error(`Decision ${decisionId} not found`);
		}

		const { parseFrontmatter: parseFm } = await import("../utils/frontmatter.ts");
		const { data } = parseFm(content);

		const extractSection = (content: string, sectionName: string): string | undefined => {
			const regex = new RegExp(`## ${sectionName}\\s*([\\s\\S]*?)(?=## |$)`, "i");
			const match = content.match(regex);
			return match ? match[1]?.trim() : undefined;
		};

		const updatedDecision = {
			...existingDecision,
			title: typeof data.title === "string" ? data.title : existingDecision.title,
			status: typeof data.status === "string" ? data.status : existingDecision.status,
			date: typeof data.date === "string" ? data.date : existingDecision.date,
			context: extractSection(content, "Context") || existingDecision.context,
			decision: extractSection(content, "Decision") || existingDecision.decision,
			consequences: extractSection(content, "Consequences") || existingDecision.consequences,
			alternatives: extractSection(content, "Alternatives") || existingDecision.alternatives,
			supersedes: typeof data.supersedes === "string" ? data.supersedes : existingDecision.supersedes,
			supersededBy: typeof data.supersededBy === "string" ? data.supersededBy : existingDecision.supersededBy,
		};

		await this.createDecision(updatedDecision as Decision, autoCommit);
	}

	async createDecisionWithTitle(title: string, autoCommit?: boolean): Promise<Decision> {
		const { generateNextDecisionId } = await import("../commands/decision.ts");
		const id = await generateNextDecisionId(this);

		const decision: Decision = {
			id,
			title,
			date: taskOps.formatDateStamp(),
			status: "proposed",
			context: "[Describe the context and problem that needs to be addressed]",
			decision: "[Describe the decision that was made]",
			consequences: "[Describe the consequences of this decision]",
			rawContent: "",
		};

		await this.createDecision(decision, autoCommit);
		return decision;
	}

	async createDocument(doc: Document, autoCommit?: boolean, subPath = ""): Promise<void> {
		const relativePath = await this._filesystem.saveDocument(doc, normalizeDocumentSubPath(subPath));
		doc.path = relativePath;

		await this.stageAndCommit(`backlog: Add document ${doc.id}`, autoCommit);
	}

	async updateDocument(existingDoc: Document, content: string, autoCommit?: boolean): Promise<void> {
		await this.updateDocumentFromInput(
			{
				id: existingDoc.id,
				title: existingDoc.title,
				type: existingDoc.type,
				tags: existingDoc.tags,
				labels: existingDoc.labels,
				content,
				...(existingDoc.path !== undefined && { path: getDocumentSubPathFromRelativePath(existingDoc.path) }),
			},
			autoCommit,
		);
	}

	async createDocumentWithId(title: string, content: string, autoCommit?: boolean): Promise<Document> {
		return await this.createDocumentFromInput({ title, content }, autoCommit);
	}

	async createDocumentFromInput(input: DocumentCreateInput, autoCommit?: boolean): Promise<Document> {
		const title = input.title.trim();
		if (!title) {
			throw new Error("Title is required to create a document.");
		}

		const subPath = normalizeDocumentSubPath(input.path);
		const labels = normalizeStringList(input.labels);
		const tags = normalizeStringList(input.tags);
		const type = normalizeDocumentTypeInput(input.type) ?? "other";
		const document = await this.withCreateLock(async () => {
			const id = normalizeDocumentId(await generateNextDocId(this));
			const document: Document = {
				id,
				title,
				type,
				createdDate: taskOps.formatDateStamp(),
				rawContent: input.content ?? "",
				...(labels && labels.length > 0 && { labels }),
				...(tags && tags.length > 0 && { tags }),
			};

			await this.createDocument(document, autoCommit, subPath);
			return document;
		});

		return (await this.getDocument(document.id)) ?? document;
	}

	async updateDocumentFromInput(input: DocumentUpdateInput, autoCommit?: boolean): Promise<Document> {
		const existingDoc = await this.getDocument(input.id);
		if (!existingDoc) {
			throw new Error(`Document not found: ${input.id}`);
		}

		const normalizedTitle = input.title?.trim();
		if (input.title !== undefined && !normalizedTitle) {
			throw new Error("Document title cannot be empty.");
		}

		const labels = input.labels !== undefined ? normalizeStringList(input.labels) : existingDoc.labels;
		const tags = input.tags !== undefined ? normalizeStringList(input.tags) : existingDoc.tags;
		const type = normalizeDocumentTypeInput(input.type) ?? existingDoc.type;
		const subPath =
			input.path === undefined
				? getDocumentSubPathFromRelativePath(existingDoc.path)
				: normalizeDocumentSubPath(input.path);
		const updatedDoc: Document = {
			...existingDoc,
			id: normalizeDocumentId(existingDoc.id),
			title: normalizedTitle ?? existingDoc.title,
			type,
			rawContent: input.content ?? existingDoc.rawContent,
			updatedDate: taskOps.formatDateStamp(),
			labels: labels && labels.length > 0 ? labels : undefined,
			tags: tags && tags.length > 0 ? tags : undefined,
		};

		await this.createDocument(updatedDoc, autoCommit, subPath);
		return (await this.getDocument(existingDoc.id)) ?? updatedDoc;
	}

	async listTasksWithMetadata(
		includeBranchMeta = false,
	): Promise<Array<Task & { lastModified?: Date; branch?: string }>> {
		const tasks = await this._filesystem.listTasks();
		return await Promise.all(
			tasks.map(async (task) => {
				const filePath = await getTaskPath(task.id, this);

				if (filePath) {
					const bunFile = Bun.file(filePath);
					const stats = await bunFile.stat();
					return {
						...task,
						lastModified: new Date(stats.mtime),
						// Only include branch if explicitly requested
						...(includeBranchMeta && {
							branch: (await this.git.getFileLastModifiedBranch(filePath)) || undefined,
						}),
					};
				}
				return task;
			}),
		);
	}

	/**
	 * Open a file in the configured editor with minimal interference
	 * @param filePath - Path to the file to edit
	 * @param screen - Optional blessed screen to suspend (for TUI contexts)
	 */
	async editTaskInTui(taskId: string, screen: BlessedScreen, selectedTask?: Task): Promise<TuiTaskEditResult> {
		const contextualTask = selectedTask && taskIdsEqual(selectedTask.id, taskId) ? selectedTask : undefined;

		if (contextualTask && (!isLocalEditableTask(contextualTask) || contextualTask.branch)) {
			return { changed: false, task: contextualTask, reason: "read_only" };
		}

		const resolvedTask = contextualTask ?? (await this.getTask(taskId));
		if (!resolvedTask) {
			return { changed: false, reason: "not_found" };
		}
		if (!isLocalEditableTask(resolvedTask) || resolvedTask.branch) {
			return { changed: false, task: resolvedTask, reason: "read_only" };
		}

		const localTask = await this._filesystem.loadTask(resolvedTask.id);
		const editableTask = localTask ?? resolvedTask;

		const filePath = await getTaskPath(editableTask.id, this);
		if (!filePath) {
			return { changed: false, task: editableTask, reason: "not_found" };
		}

		let beforeContent: string;
		try {
			beforeContent = await Bun.file(filePath).text();
		} catch {
			return { changed: false, task: editableTask, reason: "not_found" };
		}

		const opened = await this.openEditor(filePath, screen);
		if (!opened) {
			return { changed: false, task: editableTask, reason: "editor_failed" };
		}

		let afterContent: string;
		try {
			afterContent = await Bun.file(filePath).text();
		} catch {
			return { changed: false, task: editableTask, reason: "not_found" };
		}

		if (afterContent === beforeContent) {
			const refreshedTask = await this._filesystem.loadTask(editableTask.id);
			return { changed: false, task: refreshedTask ?? editableTask };
		}

		const now = taskOps.formatDateStamp();
		const withUpdatedDate = upsertTaskUpdatedDate(afterContent, now);
		await Bun.write(filePath, withUpdatedDate);

		const refreshedTask = await this._filesystem.loadTask(editableTask.id);
		if (refreshedTask && this.contentStore) {
			this.contentStore.upsertTask(refreshedTask);
		}

		return {
			changed: true,
			task: refreshedTask ?? { ...editableTask, updatedDate: now },
		};
	}

	async openEditor(filePath: string, screen?: BlessedScreen): Promise<boolean> {
		const config = await this._filesystem.loadConfig();

		// If no screen provided, use simple editor opening
		if (!screen) {
			return await openInEditor(filePath, config);
		}

		const program = screen.program;

		// Leave alternate screen buffer FIRST
		screen.leave();

		// Reset keypad/cursor mode using terminfo if available
		if (typeof program.put?.keypad_local === "function") {
			program.put.keypad_local();
			if (typeof program.flush === "function") {
				program.flush();
			}
		}

		// Send escape sequences directly as reinforcement
		// ESC[0m   = Reset all SGR attributes (fixes white background in nano)
		// ESC[?25h = Show cursor (ensure cursor is visible)
		// ESC[?1l  = Reset DECCKM (cursor keys send CSI sequences)
		// ESC>     = DECKPNM (numeric keypad mode)
		const fs = await import("node:fs");
		fs.writeSync(1, "\u001b[0m\u001b[?25h\u001b[?1l\u001b>");

		// Pause the terminal AFTER leaving alt buffer (disables raw mode, releases terminal)
		const resume = typeof program.pause === "function" ? program.pause() : undefined;
		try {
			return await openInEditor(filePath, config);
		} finally {
			// Resume terminal state FIRST (re-enables raw mode)
			if (typeof resume === "function") {
				resume();
			}
			// Re-enter alternate screen buffer
			screen.enter();
			// Restore application cursor mode
			if (typeof program.put?.keypad_xmit === "function") {
				program.put.keypad_xmit();
				if (typeof program.flush === "function") {
					program.flush();
				}
			}
			// Full redraw
			screen.render();
		}
	}

	private async loadTaskData(
		progressCallback?: (msg: string) => void,
		options?: { abortSignal?: AbortSignal; includeCompleted?: boolean },
	): Promise<{
		config: BacklogConfig | null;
		statuses: string[];
		localTasks: Task[];
		completedTasks: Task[];
		allTasks: Task[];
		branchStateEntries?: BranchTaskStateEntry[];
	}> {
		const config = await this._filesystem.loadConfig();
		const statuses = (config?.statuses || DEFAULT_STATUSES) as string[];
		const resolutionStrategy = config?.taskResolutionStrategy || "most_progressed";
		const includeCompleted = options?.includeCompleted ?? false;

		const checkAborted = () => {
			if (options?.abortSignal?.aborted) throw new Error("Loading cancelled");
		};
		checkAborted();

		progressCallback?.("Loading local tasks...");
		const [localTasks, completedTasks] = await Promise.all([
			this.listTasksWithMetadata(),
			includeCompleted ? this._filesystem.listCompletedTasks() : Promise.resolve([]),
		]);
		checkAborted();

		let remoteTasks: Task[] = [];
		let localBranchTasks: Task[] = [];
		let branchStateEntries: BranchTaskStateEntry[] | undefined;

		if (config?.checkActiveBranches !== false) {
			progressCallback?.(getTaskLoadingMessage(config));
			branchStateEntries = [];
			const backlogDir = await this.getBacklogDirectoryName();
			[remoteTasks, localBranchTasks] = await Promise.all([
				loadRemoteTasks(
					this.git,
					config,
					progressCallback,
					localTasks,
					branchStateEntries,
					includeCompleted,
					backlogDir,
				),
				loadLocalBranchTasks(
					this.git,
					config,
					progressCallback,
					localTasks,
					branchStateEntries,
					includeCompleted,
					backlogDir,
				),
			]);
		}
		checkAborted();

		const tasksById = new Map<string, Task>(localTasks.map((t) => [t.id, { ...t, source: "local" }]));

		if (includeCompleted) {
			for (const completedTask of completedTasks) {
				if (!tasksById.has(completedTask.id)) {
					tasksById.set(completedTask.id, { ...completedTask, source: "completed" });
				}
			}
		}

		progressCallback?.("Merging tasks...");
		mergeTaskArray(tasksById, localBranchTasks, options?.abortSignal, statuses, resolutionStrategy);
		mergeTaskArray(tasksById, remoteTasks, options?.abortSignal, statuses, resolutionStrategy);
		checkAborted();

		const allTasks = Array.from(tasksById.values());
		checkAborted();

		return { config, statuses, localTasks, completedTasks, allTasks, branchStateEntries };
	}

	async loadAllTasksForStatistics(progressCallback?: (msg: string) => void): Promise<{
		tasks: Task[];
		drafts: Task[];
		statuses: string[];
		terminalStatuses?: string[];
		blockedStatuses?: string[];
	}> {
		const { config, statuses, localTasks, allTasks, branchStateEntries } = await this.loadTaskData(progressCallback, {
			includeCompleted: true,
		});

		let activeTasks: Task[];
		if (config?.checkActiveBranches === false) {
			activeTasks = allTasks;
		} else {
			progressCallback?.("Applying latest task states from branch scans...");
			activeTasks = filterTasksByStateSnapshots(allTasks, buildLatestStateMap(branchStateEntries || [], localTasks));
		}

		progressCallback?.("Loading drafts...");
		const drafts = await this._filesystem.listDrafts();

		return {
			tasks: activeTasks,
			drafts,
			statuses: statuses as string[],
			terminalStatuses: config?.terminalStatuses,
			blockedStatuses: config?.blockedStatuses,
		};
	}

	async loadTasks(
		progressCallback?: (msg: string) => void,
		abortSignal?: AbortSignal,
		options?: { includeCompleted?: boolean },
	): Promise<Task[]> {
		const includeCompleted = options?.includeCompleted ?? false;
		const { config, branchStateEntries, localTasks, completedTasks, allTasks } = await this.loadTaskData(
			progressCallback,
			{ abortSignal, includeCompleted },
		);

		if (config?.checkActiveBranches === false) {
			return allTasks;
		}
		progressCallback?.("Applying latest task states from branch scans...");
		return filterTasksWithCompleted(
			allTasks,
			branchStateEntries,
			localTasks,
			completedTasks,
			abortSignal,
			includeCompleted,
		);
	}
}
