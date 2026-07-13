import { unlink } from "node:fs/promises";
import { EntityType, type Task, type TaskUpdateInput } from "../types/index.ts";
import { normalizeAssignee } from "../utils/assignee.ts";
import { normalizeId } from "../utils/prefix-config.ts";
import { normalizeTaskId } from "../utils/task-path.ts";
import type { CoreDeps } from "./core-deps.ts";
import { applyTaskUpdateInput, formatDateStamp } from "./task-operations.ts";

async function withAutoCommit(shouldCommit: boolean, fn: () => Promise<void>): Promise<void> {
	if (shouldCommit) {
		await fn();
	}
}

export async function updateDraft(deps: CoreDeps, task: Task, autoCommit?: boolean): Promise<void> {
	task.status = "Draft";
	normalizeAssignee(task);
	task.updatedDate = formatDateStamp();

	const filepath = await deps.filesystem.saveDraft(task);

	await withAutoCommit(await deps.shouldAutoCommit(autoCommit), async () => {
		await deps.git.addFile(filepath);
		await deps.git.commitTaskChange(task.id, `Update draft ${task.id}`, filepath);
	});
}

export async function updateDraftFromInput(
	deps: CoreDeps,
	draftId: string,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const draft = await deps.filesystem.loadDraft(draftId);
	if (!draft) {
		throw new Error(`Draft not found: ${draftId}`);
	}

	const { mutated } = await applyTaskUpdateInput(deps, draft, input, async (status) => {
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

export async function promoteDraftWithUpdates(
	deps: CoreDeps,
	draft: Task,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const targetStatus = input.status?.trim();
	if (!targetStatus || targetStatus.toLowerCase() === "draft") {
		throw new Error("Promoting a draft requires a non-draft status.");
	}

	const { mutated } = await applyTaskUpdateInput(deps, draft, { ...input, status: undefined }, async (status) => {
		if (status.trim().toLowerCase() !== "draft") {
			throw new Error("Drafts must use status Draft.");
		}
		return "Draft";
	});

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

export async function demoteTaskWithUpdates(
	deps: CoreDeps,
	task: Task,
	input: TaskUpdateInput,
	autoCommit?: boolean,
): Promise<Task> {
	const { mutated } = await applyTaskUpdateInput(deps, task, { ...input, status: undefined }, async (status) => {
		if (status.trim().toLowerCase() === "draft") {
			return "Draft";
		}
		return deps.requireCanonicalStatus(status);
	});

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

export async function archiveDraft(deps: CoreDeps, draftId: string, autoCommit?: boolean): Promise<boolean> {
	const success = await deps.filesystem.archiveDraft(draftId);

	if (success) {
		await deps.stageAndCommit(`backlog: Archive draft ${normalizeId(draftId, "draft")}`, autoCommit);
	}

	return success;
}

export async function promoteDraft(deps: CoreDeps, draftId: string, autoCommit?: boolean): Promise<boolean> {
	const success = await deps.filesystem.promoteDraft(draftId);

	if (success) {
		await deps.stageAndCommit(`backlog: Promote draft ${normalizeId(draftId, "draft")}`, autoCommit);
	}

	return success;
}

export async function demoteTask(deps: CoreDeps, taskId: string, autoCommit?: boolean): Promise<boolean> {
	const success = await deps.filesystem.demoteTask(taskId);

	if (success) {
		await deps.stageAndCommit(`backlog: Demote task ${normalizeTaskId(taskId)}`, autoCommit);
	}

	return success;
}
