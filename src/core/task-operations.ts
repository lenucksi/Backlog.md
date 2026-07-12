import { DEFAULT_STATUSES, FALLBACK_STATUS } from "../constants/index.ts";
import type { BacklogConfig, Task, TaskCreateInput, TaskListFilter, TaskUpdateInput } from "../types/index.ts";
import { EntityType } from "../types/index.ts";
import { normalizeAssignee } from "../utils/assignee.ts";
import { executeStatusCallback } from "../utils/status-callback.ts";
import {
	buildDefinitionOfDoneItems,
	normalizeDependencies,
	normalizeStringList,
	stringArraysEqual,
} from "../utils/task-builders.ts";
import { getTaskPath, normalizeTaskId, taskIdsEqual } from "../utils/task-path.ts";
import { isTerminalStatus } from "../utils/terminal-status.ts";
import { DEFAULT_ORDINAL_STEP } from "./reorder.ts";
import {
	applyClearSetAppendBlock,
	applyStringField,
	resolveAcceptanceCriteriaFromInput,
	resolveDefinitionOfDoneFromInput,
	resolveDependenciesFromInput,
	resolveModifiedFilesFromInput,
	resolveStringListField,
} from "./task-input-resolvers.ts";

export function formatDateStamp(): string {
	return new Date().toISOString().slice(0, 16).replace("T", " ");
}

async function withGitCommit(shouldAutoCommit: boolean, fn: () => Promise<void>): Promise<void> {
	if (shouldAutoCommit) {
		await fn();
	}
}

export interface TaskOpDeps {
	filesystem: {
		loadConfig(): Promise<BacklogConfig | null>;
		listTasks(): Promise<Task[]>;
		loadTask(id: string): Promise<Task | null>;
		saveTask(task: Task): Promise<string>;
		saveDraft(draft: Task): Promise<string>;
		loadDraft(id: string): Promise<Task | null>;
		listDrafts(): Promise<Array<{ id: string }>>;
		tasksDir: string;
		archiveTasksDir: string;
	};
	contentStore?: {
		upsertTask(task: Task): void;
	};
	git: {
		addFile(filepath: string): Promise<void>;
		commitTaskChange(id: string, message: string, filepath: string): Promise<void>;
		addAndCommitTaskFile(id: string, filepath: string, type: "create" | "update"): Promise<void>;
	};
	idGenerator: {
		generateNextId(type: EntityType, parent?: string): Promise<string>;
	};
	requireCanonicalStatus(status: string): Promise<string>;
	normalizePriority(value: string | undefined): "high" | "medium" | "low" | undefined;
	shouldAutoCommit(overrideValue?: boolean): Promise<boolean>;
	getBacklogDirectoryName(): Promise<string>;
	withCreateLock<T>(fn: () => Promise<T>): Promise<T>;
	queryTasks(options?: {
		filters?: TaskListFilter;
		query?: string;
		limit?: number;
		includeCrossBranch?: boolean;
	}): Promise<Task[]>;
	demoteTaskWithUpdates(task: Task, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task>;
	promoteDraftWithUpdates(draft: Task, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task>;
	updateDraftFromInput(draftId: string, input: TaskUpdateInput, autoCommit?: boolean): Promise<Task>;
}

async function resolveCreateOrdinal(
	deps: TaskOpDeps,
	inputOrdinal: number | undefined,
	isDraft: boolean,
): Promise<number | undefined> {
	if (typeof inputOrdinal === "number") {
		return inputOrdinal;
	}
	if (isDraft) {
		return undefined;
	}

	const tasks = await deps.filesystem.listTasks();
	const ordinals = tasks
		.map((task) => task.ordinal)
		.filter((ordinal): ordinal is number => typeof ordinal === "number" && Number.isFinite(ordinal));

	if (ordinals.length === 0) {
		return tasks.length === 0 ? DEFAULT_ORDINAL_STEP : undefined;
	}

	return Math.max(...ordinals) + DEFAULT_ORDINAL_STEP;
}

async function writePreparedTask(deps: TaskOpDeps, task: Task, isDraft: boolean): Promise<string> {
	if (isDraft) {
		task.status = "Draft";
		normalizeAssignee(task);
		return await deps.filesystem.saveDraft(task);
	}

	normalizeAssignee(task);
	return await deps.filesystem.saveTask(task);
}

async function finalizeCreatedTask(
	deps: TaskOpDeps,
	task: Task,
	filepath: string,
	isDraft: boolean,
	autoCommit?: boolean,
): Promise<Task | null> {
	const savedTask = isDraft ? await deps.filesystem.loadDraft(task.id) : await deps.filesystem.loadTask(task.id);

	if (!isDraft && deps.contentStore && savedTask) {
		deps.contentStore.upsertTask(savedTask);
	}

	await withGitCommit(await deps.shouldAutoCommit(autoCommit), async () => {
		if (isDraft) {
			await deps.git.addFile(filepath);
			await deps.git.commitTaskChange(task.id, `Create draft ${task.id}`, filepath);
		} else {
			await deps.git.addAndCommitTaskFile(task.id, filepath, "create");
		}
	});

	return savedTask;
}

export async function createTaskFromInput(
	deps: TaskOpDeps,
	input: TaskCreateInput,
	autoCommit?: boolean,
): Promise<{ task: Task; filePath?: string }> {
	if (!input.title || input.title.trim().length === 0) {
		throw new Error("Title is required to create a task.");
	}

	const requestedStatus = input.status?.trim();
	const isDraft = requestedStatus?.toLowerCase() === "draft";

	const entityType = isDraft ? EntityType.Draft : EntityType.Task;

	const normalizedLabels = normalizeStringList(input.labels) ?? [];
	const normalizedAssignees = normalizeStringList(input.assignee) ?? [];
	const normalizedDependencies = normalizeDependencies(input.dependencies);
	const normalizedReferences = normalizeStringList(input.references) ?? [];
	const normalizedDocumentation = normalizeStringList(input.documentation) ?? [];
	const normalizedModifiedFiles = normalizeStringList(input.modifiedFiles) ?? [];

	const validDependencies: string[] = [];
	const invalidDependencies: string[] = [];
	if (normalizedDependencies.length > 0) {
		const [tasks, drafts] = await Promise.all([deps.queryTasks(), deps.filesystem.listDrafts()]);
		const knownIds = [...tasks.map((t) => t.id), ...drafts.map((d) => d.id)];
		for (const dep of normalizedDependencies) {
			const match = knownIds.find((id) => taskIdsEqual(dep, id));
			if (match) {
				validDependencies.push(match);
			} else {
				invalidDependencies.push(dep);
			}
		}
	}
	if (invalidDependencies.length > 0) {
		throw new Error(
			`The following dependencies do not exist: ${invalidDependencies.join(", ")}. Please create these tasks first or verify the IDs.`,
		);
	}

	let status = "";
	if (requestedStatus) {
		if (isDraft) {
			status = "Draft";
		} else {
			status = await deps.requireCanonicalStatus(requestedStatus);
		}
	}

	const priority = deps.normalizePriority(input.priority);
	const createdDate = formatDateStamp();
	if (
		input.ordinal !== undefined &&
		(typeof input.ordinal !== "number" || !Number.isFinite(input.ordinal) || input.ordinal < 0)
	) {
		throw new Error("Ordinal must be a non-negative number.");
	}

	const acceptanceCriteriaItems = Array.isArray(input.acceptanceCriteria)
		? input.acceptanceCriteria
				.map((criterion, index) => ({
					index: index + 1,
					text: String(criterion.text ?? "").trim(),
					checked: Boolean(criterion.checked),
				}))
				.filter((criterion) => criterion.text.length > 0)
		: [];
	const config = await deps.filesystem.loadConfig();
	const definitionOfDoneItems = buildDefinitionOfDoneItems({
		defaults: config?.definitionOfDone,
		add: input.definitionOfDoneAdd,
		disableDefaults: input.disableDefinitionOfDoneDefaults,
	});
	const resolvedStatus = isDraft ? "Draft" : status || config?.defaultStatus || FALLBACK_STATUS;

	const { task, filePath } = await deps.withCreateLock(async () => {
		const id = await deps.idGenerator.generateNextId(entityType, isDraft ? undefined : input.parentTaskId);
		const ordinal = await resolveCreateOrdinal(deps, input.ordinal, isDraft);
		const task: Task = {
			id,
			title: input.title.trim(),
			status: resolvedStatus,
			assignee: normalizedAssignees,
			labels: normalizedLabels,
			dependencies: validDependencies,
			references: normalizedReferences,
			documentation: normalizedDocumentation,
			modifiedFiles: normalizedModifiedFiles,
			rawContent: input.rawContent ?? "",
			createdDate,
			...(input.parentTaskId && { parentTaskId: input.parentTaskId }),
			...(priority && { priority }),
			...(typeof ordinal === "number" && { ordinal }),
			...(typeof input.milestone === "string" &&
				input.milestone.trim().length > 0 && {
					milestone: input.milestone.trim(),
				}),
			...(typeof input.description === "string" && { description: input.description }),
			...(typeof input.implementationPlan === "string" && { implementationPlan: input.implementationPlan }),
			...(typeof input.implementationNotes === "string" && { implementationNotes: input.implementationNotes }),
			...(typeof input.finalSummary === "string" && { finalSummary: input.finalSummary }),
			...(acceptanceCriteriaItems.length > 0 && { acceptanceCriteriaItems }),
			...(definitionOfDoneItems && definitionOfDoneItems.length > 0 && { definitionOfDoneItems }),
			...(input.dueDate && { dueDate: input.dueDate }),
			...(input.deferDate && { deferDate: input.deferDate }),
		};

		const filePath = await writePreparedTask(deps, task, isDraft);
		return { task, filePath };
	});

	const savedTask = await finalizeCreatedTask(deps, task, filePath, isDraft, autoCommit);
	return { task: savedTask ?? task, filePath };
}

export async function createTask(deps: TaskOpDeps, task: Task, autoCommit?: boolean): Promise<string> {
	if (!task.status) {
		const config = await deps.filesystem.loadConfig();
		task.status = config?.defaultStatus || FALLBACK_STATUS;
	}

	const filepath = await writePreparedTask(deps, task, false);
	await finalizeCreatedTask(deps, task, filepath, false, autoCommit);

	return filepath;
}

export async function updateTask(deps: TaskOpDeps, task: Task, autoCommit?: boolean): Promise<void> {
	normalizeAssignee(task);

	const originalTask = await deps.filesystem.loadTask(task.id);
	const oldStatus = originalTask?.status ?? "";
	const newStatus = task.status ?? "";
	const statusChanged = oldStatus !== newStatus;

	if (statusChanged && !task.completedDate) {
		const config = await deps.filesystem.loadConfig();
		const statuses = config?.statuses ?? [...DEFAULT_STATUSES];
		if (isTerminalStatus(newStatus, statuses, config?.terminalStatuses)) {
			task.completedDate = formatDateStamp();
		}
	}

	task.updatedDate = formatDateStamp();

	await deps.filesystem.saveTask(task);
	if (deps.contentStore) {
		const savedTask = await deps.filesystem.loadTask(task.id);
		if (savedTask) {
			deps.contentStore.upsertTask(savedTask);
		}
	}

	await withGitCommit(await deps.shouldAutoCommit(autoCommit), async () => {
		const filePath = await getTaskPath(task.id, { filesystem: { tasksDir: deps.filesystem.tasksDir } });
		if (filePath) {
			await deps.git.addAndCommitTaskFile(task.id, filePath, "update");
		}
	});

	if (statusChanged) {
		await executeStatusChangeCallback(deps, task, oldStatus, newStatus);
	}
}

export async function applyTaskUpdateInput(
	deps: TaskOpDeps,
	task: Task,
	input: TaskUpdateInput,
	statusResolver: (status: string) => Promise<string>,
): Promise<{ task: Task; mutated: boolean }> {
	let mutated = false;

	if (input.title !== undefined) {
		const trimmed = input.title.trim();
		if (trimmed.length === 0) {
			throw new Error("Title cannot be empty.");
		}
		if (task.title !== trimmed) {
			task.title = trimmed;
			mutated = true;
		}
	}

	mutated =
		applyStringField(input.description, task.description, (next) => {
			task.description = next;
		}) || mutated;

	if (input.status !== undefined) {
		const canonicalStatus = await statusResolver(input.status);
		if ((task.status ?? "") !== canonicalStatus) {
			task.status = canonicalStatus;
			mutated = true;
		}
	}

	if (input.priority !== undefined) {
		const normalizedPriority = deps.normalizePriority(String(input.priority));
		if (task.priority !== normalizedPriority) {
			task.priority = normalizedPriority;
			mutated = true;
		}
	}

	if (input.milestone !== undefined) {
		const normalizedMilestone =
			input.milestone === null ? undefined : input.milestone.trim().length > 0 ? input.milestone.trim() : undefined;
		if ((task.milestone ?? undefined) !== normalizedMilestone) {
			if (normalizedMilestone === undefined) {
				delete task.milestone;
			} else {
				task.milestone = normalizedMilestone;
			}
			mutated = true;
		}
	}

	if (input.ordinal !== undefined) {
		if (typeof input.ordinal !== "number" || !Number.isFinite(input.ordinal) || input.ordinal < 0) {
			throw new Error("Ordinal must be a non-negative number.");
		}
		if (task.ordinal !== input.ordinal) {
			task.ordinal = input.ordinal;
			mutated = true;
		}
	}

	if (input.assignee !== undefined) {
		const sanitizedAssignee = normalizeStringList(input.assignee) ?? [];
		if (!stringArraysEqual(sanitizedAssignee, task.assignee ?? [])) {
			task.assignee = sanitizedAssignee;
			mutated = true;
		}
	}

	if (input.labels !== undefined && (input.addLabels || input.removeLabels)) {
		throw new Error(
			"Cannot combine --label (replace) with --add-label or --remove-label (incremental). Use only one mode.",
		);
	}
	if (input.clearLabels) {
		task.labels = [];
		mutated = true;
	}
	mutated =
		resolveStringListField(task, { set: input.labels, add: input.addLabels, remove: input.removeLabels }, "labels") ||
		mutated;
	mutated =
		(await resolveDependenciesFromInput(
			task,
			{
				set: input.dependencies,
				add: input.addDependencies,
				remove: input.removeDependencies,
				force: input.force,
			},
			{
				queryTasks: (opts) => deps.queryTasks(opts),
				filesystem: { listDrafts: () => deps.filesystem.listDrafts() },
			},
		)) || mutated;
	mutated =
		resolveStringListField(
			task,
			{ set: input.references, add: input.addReferences, remove: input.removeReferences },
			"references",
		) || mutated;
	mutated =
		resolveStringListField(
			task,
			{ set: input.documentation, add: input.addDocumentation, remove: input.removeDocumentation },
			"documentation",
		) || mutated;
	mutated = resolveModifiedFilesFromInput(task, input) || mutated;

	if (input.dueDate !== undefined) {
		const normalized = input.dueDate === null ? undefined : input.dueDate;
		if (task.dueDate !== normalized) {
			task.dueDate = normalized;
			mutated = true;
		}
	}

	if (input.deferDate !== undefined) {
		const normalized = input.deferDate === null ? undefined : input.deferDate;
		if (task.deferDate !== normalized) {
			task.deferDate = normalized;
			mutated = true;
		}
	}

	mutated =
		applyClearSetAppendBlock(
			task,
			"implementationPlan",
			input.clearImplementationPlan,
			input.implementationPlan,
			input.appendImplementationPlan,
		) || mutated;
	mutated =
		applyClearSetAppendBlock(
			task,
			"implementationNotes",
			input.clearImplementationNotes,
			input.implementationNotes,
			input.appendImplementationNotes,
		) || mutated;
	mutated =
		applyClearSetAppendBlock(
			task,
			"finalSummary",
			input.clearFinalSummary,
			input.finalSummary,
			input.appendFinalSummary,
		) || mutated;

	mutated = resolveAcceptanceCriteriaFromInput(task, input) || mutated;
	mutated = resolveDefinitionOfDoneFromInput(task, input) || mutated;

	return { task, mutated };
}

export async function updateTaskFromInput(
	deps: TaskOpDeps,
	taskId: string,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const task = await deps.filesystem.loadTask(taskId);
	if (!task) {
		throw new Error(`Task not found: ${taskId}`);
	}

	const requestedStatus = input.status?.trim().toLowerCase();
	if (requestedStatus === "draft") {
		return await deps.demoteTaskWithUpdates(task, input, autoCommit);
	}

	const { mutated } = await applyTaskUpdateInput(deps, task, input, async (status) =>
		deps.requireCanonicalStatus(status),
	);

	if (!mutated) {
		return task;
	}

	await updateTask(deps, task, autoCommit);
	const refreshed = await deps.filesystem.loadTask(taskId);
	return refreshed ?? task;
}

export async function editTaskOrDraft(
	deps: TaskOpDeps,
	taskId: string,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const draft = await deps.filesystem.loadDraft(taskId);
	if (draft) {
		const requestedStatus = input.status?.trim();
		const wantsDraft = requestedStatus?.toLowerCase() === "draft";
		if (requestedStatus && !wantsDraft) {
			return await deps.promoteDraftWithUpdates(draft, input, autoCommit);
		}
		return await deps.updateDraftFromInput(draft.id, input, autoCommit);
	}

	const task = await deps.filesystem.loadTask(taskId);
	if (!task) {
		throw new Error(`Task not found: ${taskId}`);
	}

	const requestedStatus = input.status?.trim();
	const wantsDraft = requestedStatus?.toLowerCase() === "draft";
	if (wantsDraft) {
		return await deps.demoteTaskWithUpdates(task, input, autoCommit);
	}

	return await updateTaskFromInput(deps, task.id, input, autoCommit);
}

export async function editTask(
	deps: TaskOpDeps,
	taskId: string,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const archiveDir = deps.filesystem.archiveTasksDir;
	const taskPath = await getTaskPath(taskId, { filesystem: { tasksDir: deps.filesystem.tasksDir } });
	if (taskPath?.startsWith(archiveDir)) {
		throw new Error(`Cannot edit archived task ${normalizeTaskId(taskId)}`);
	}
	return await updateTaskFromInput(deps, taskId, input, autoCommit);
}

async function executeStatusChangeCallback(
	deps: TaskOpDeps,
	task: Task,
	oldStatus: string,
	newStatus: string,
): Promise<void> {
	const config = await deps.filesystem.loadConfig();

	const callbackCommand = task.onStatusChange ?? config?.onStatusChange;
	if (!callbackCommand) {
		return;
	}

	try {
		const result = await executeStatusCallback({
			command: callbackCommand,
			taskId: task.id,
			oldStatus,
			newStatus,
			taskTitle: task.title,
			cwd: deps.filesystem.tasksDir,
		});

		if (!result.success) {
			console.error(`Status change callback failed for ${task.id}: ${result.error ?? "Unknown error"}`);
			if (result.output) {
				console.error(`Callback output: ${result.output}`);
			}
		} else if (process.env.DEBUG && result.output) {
			console.log(`Status change callback output for ${task.id}: ${result.output}`);
		}
	} catch (error) {
		console.error(
			`Failed to execute status change callback for ${task.id}:`,
			error instanceof Error ? error.message : String(error),
		);
	}
}
