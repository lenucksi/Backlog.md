import { unlink } from "node:fs/promises";
import { EntityType, type Task, type TaskListFilter, type TaskUpdateInput } from "../types/index.ts";
import { normalizeAssignee } from "../utils/assignee.ts";
import { normalizeId } from "../utils/prefix-config.ts";
import { normalizeTaskId } from "../utils/task-path.ts";
import { applyTaskUpdateInput, formatDateStamp, type TaskOpDeps } from "./task-operations.ts";

export interface DraftOpDeps {
	filesystem: {
		saveTask(task: Task): Promise<string>;
		loadTask(id: string): Promise<Task | null>;
		saveDraft(task: Task): Promise<string>;
		loadDraft(id: string): Promise<Task | null>;
		listDrafts(): Promise<Array<{ id: string }>>;
		archiveDraft(id: string): Promise<boolean>;
		promoteDraft(id: string): Promise<boolean>;
		demoteTask(id: string): Promise<boolean>;
	};
	contentStore?: {
		upsertTask(task: Task): void;
	};
	git: {
		addFile(filepath: string): Promise<void>;
		commitTaskChange(id: string, message: string, filepath: string): Promise<void>;
	};
	idGenerator: {
		generateNextId(type: EntityType, parent?: string): Promise<string>;
	};
	withCreateLock: <T>(fn: () => Promise<T>) => Promise<T>;
	requireCanonicalStatus: (status: string) => Promise<string>;
	shouldAutoCommit: (overrideValue?: boolean) => Promise<boolean>;
	stageAndCommit: (message: string, autoCommit?: boolean) => Promise<void>;
	normalizePriority: (value: string | undefined) => "high" | "medium" | "low" | undefined;
	queryTasks: (options?: {
		filters?: TaskListFilter;
		query?: string;
		limit?: number;
		includeCrossBranch?: boolean;
	}) => Promise<Task[]>;
}

/** Local helper: only commit when auto-commit is enabled (same pattern as withGitCommit) */
async function withAutoCommit(shouldCommit: boolean, fn: () => Promise<void>): Promise<void> {
	if (shouldCommit) {
		await fn();
	}
}

// updateDraft — standardised to withAutoCommit (was old-style manual git)

export async function updateDraft(deps: DraftOpDeps, task: Task, autoCommit?: boolean): Promise<void> {
	task.status = "Draft";
	normalizeAssignee(task);
	task.updatedDate = formatDateStamp();

	const filepath = await deps.filesystem.saveDraft(task);

	await withAutoCommit(await deps.shouldAutoCommit(autoCommit), async () => {
		await deps.git.addFile(filepath);
		await deps.git.commitTaskChange(task.id, `Update draft ${task.id}`, filepath);
	});
}

// updateDraftFromInput

export async function updateDraftFromInput(
	deps: DraftOpDeps,
	draftId: string,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const draft = await deps.filesystem.loadDraft(draftId);
	if (!draft) {
		throw new Error(`Draft not found: ${draftId}`);
	}

	const { mutated } = await applyTaskUpdateInput(deps as unknown as TaskOpDeps, draft, input, async (status) => {
		if (status.trim().toLowerCase() !== "draft") {
			throw new Error("Drafts must use status Draft.");
		}
		return "Draft";
	});

	if (!mutated) {
		return draft;
	}

	await updateDraft(deps, draft, autoCommit);
	const refreshed = await deps.filesystem.loadDraft(draftId);
	return refreshed ?? draft;
}

// promoteDraftWithUpdates — draft → task with status change + metadata update

export async function promoteDraftWithUpdates(
	deps: DraftOpDeps,
	draft: Task,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const targetStatus = input.status?.trim();
	if (!targetStatus || targetStatus.toLowerCase() === "draft") {
		throw new Error("Promoting a draft requires a non-draft status.");
	}

	const { mutated } = await applyTaskUpdateInput(
		deps as unknown as TaskOpDeps,
		draft,
		{ ...input, status: undefined },
		async (status) => {
			if (status.trim().toLowerCase() !== "draft") {
				throw new Error("Drafts must use status Draft.");
			}
			return "Draft";
		},
	);

	const canonicalStatus = await deps.requireCanonicalStatus(targetStatus);

	const { promotedTask, savedPath } = await deps.withCreateLock(async () => {
		const newTaskId = await deps.idGenerator.generateNextId(EntityType.Task, draft.parentTaskId);
		const draftPath = draft.filePath;

		const promotedTask: Task = {
			...draft,
			id: newTaskId,
			status: canonicalStatus,
			filePath: undefined,
			...(mutated || draft.status !== canonicalStatus ? { updatedDate: formatDateStamp() } : {}),
		};

		normalizeAssignee(promotedTask);
		const savedPath = await deps.filesystem.saveTask(promotedTask);

		if (draftPath) {
			await unlink(draftPath);
		}

		return { promotedTask, savedPath };
	});

	const savedTask = await deps.filesystem.loadTask(promotedTask.id);
	if (deps.contentStore && savedTask) {
		deps.contentStore.upsertTask(savedTask);
	}

	await deps.stageAndCommit(`backlog: Promote draft ${normalizeId(draft.id, "draft")}`, autoCommit);

	return savedTask ?? { ...promotedTask, filePath: savedPath };
}

// demoteTaskWithUpdates — task → draft with optional metadata update

export async function demoteTaskWithUpdates(
	deps: DraftOpDeps,
	task: Task,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const { mutated } = await applyTaskUpdateInput(
		deps as unknown as TaskOpDeps,
		task,
		{ ...input, status: undefined },
		async (status) => {
			if (status.trim().toLowerCase() === "draft") {
				return "Draft";
			}
			return deps.requireCanonicalStatus(status);
		},
	);

	const { demotedDraft, savedPath } = await deps.withCreateLock(async () => {
		const newDraftId = await deps.idGenerator.generateNextId(EntityType.Draft);
		const taskPath = task.filePath;

		const demotedDraft: Task = {
			...task,
			id: newDraftId,
			status: "Draft",
			filePath: undefined,
			...(mutated || task.status !== "Draft" ? { updatedDate: formatDateStamp() } : {}),
		};

		normalizeAssignee(demotedDraft);
		const savedPath = await deps.filesystem.saveDraft(demotedDraft);

		if (taskPath) {
			await unlink(taskPath);
		}

		return { demotedDraft, savedPath };
	});

	await deps.stageAndCommit(`backlog: Demote task ${normalizeTaskId(task.id)}`, autoCommit);

	return (await deps.filesystem.loadDraft(demotedDraft.id)) ?? { ...demotedDraft, filePath: savedPath };
}

// Simple draft lifecycle operations

export async function archiveDraft(deps: DraftOpDeps, draftId: string, autoCommit?: boolean): Promise<boolean> {
	const success = await deps.filesystem.archiveDraft(draftId);

	if (success) {
		await deps.stageAndCommit(`backlog: Archive draft ${normalizeId(draftId, "draft")}`, autoCommit);
	}

	return success;
}

export async function promoteDraft(deps: DraftOpDeps, draftId: string, autoCommit?: boolean): Promise<boolean> {
	const success = await deps.filesystem.promoteDraft(draftId);

	if (success) {
		await deps.stageAndCommit(`backlog: Promote draft ${normalizeId(draftId, "draft")}`, autoCommit);
	}

	return success;
}

export async function demoteTask(deps: DraftOpDeps, taskId: string, autoCommit?: boolean): Promise<boolean> {
	const success = await deps.filesystem.demoteTask(taskId);

	if (success) {
		await deps.stageAndCommit(`backlog: Demote task ${normalizeTaskId(taskId)}`, autoCommit);
	}

	return success;
}
