import { basename, join } from "node:path";
import { isCreateLockError } from "../../../file-system/operations.ts";
import {
	isLocalEditableTask,
	type SearchPriorityFilter,
	type Task,
	type TaskListFilter,
} from "../../../types/index.ts";
import type { TaskEditArgs, TaskEditRequest } from "../../../types/task-edit-args.ts";
import { formatDuplicateWarning, scanForDuplicateIds } from "../../../utils/duplicate-detection.ts";
import {
	createMilestoneFilterValueResolver,
	normalizeMilestoneFilterValue,
	resolveClosestMilestoneFilterValue,
} from "../../../utils/milestone-filter.ts";
import { resolveMilestoneInputForStorage } from "../../../utils/milestone-storage.ts";
import { buildTaskUpdateInput } from "../../../utils/task-edit-builder.ts";
import { createTaskSearchIndex } from "../../../utils/task-search.ts";
import { sortByOrdinalAndPriority } from "../../../utils/task-sorting.ts";
import { getTerminalStatus, isTerminalStatus } from "../../../utils/terminal-status.ts";
import { AppError } from "../../errors/mcp-errors.ts";
import type { McpServer } from "../../server.ts";
import type { CallToolResult } from "../../types.ts";
import { formatTaskCallResult } from "../../utils/task-response.ts";

export type TaskCreateArgs = {
	title: string;
	description?: string;
	labels?: string[];
	assignee?: string[];
	priority?: "high" | "medium" | "low";
	ordinal?: number;
	status?: string;
	milestone?: string;
	parentTaskId?: string;
	acceptanceCriteria?: string[];
	definitionOfDoneAdd?: string[];
	disableDefinitionOfDoneDefaults?: boolean;
	dependencies?: string[];
	references?: string[];
	documentation?: string[];
	modifiedFiles?: string[];
	finalSummary?: string;
	dueDate?: string;
	deferDate?: string;
};

export type TaskListArgs = {
	status?: string;
	assignee?: string;
	milestone?: string;
	labels?: string[];
	search?: string;
	limit?: number;
};

export type TaskSearchArgs = {
	query?: string;
	status?: string;
	priority?: SearchPriorityFilter;
	modifiedFiles?: string[];
	limit?: number;
};

export class TaskHandlers {
	constructor(private readonly core: McpServer) {}

	private async resolveMilestoneInput(milestone: string): Promise<string> {
		const { active: activeMilestones, archived: archivedMilestones } = await this.core.filesystem.listAllMilestones();
		return resolveMilestoneInputForStorage(milestone, activeMilestones, archivedMilestones);
	}

	private isDraftStatus(status?: string | null): boolean {
		return (status ?? "").trim().toLowerCase() === "draft";
	}

	private formatTaskSummaryLine(task: Task, options: { includeStatus?: boolean } = {}): string {
		const priorityIndicator = task.priority ? `[${task.priority.toUpperCase()}] ` : "";
		const status = task.status || (task.source === "completed" ? "Done" : "");
		const statusText = options.includeStatus && status ? ` (${status})` : "";
		return `  ${priorityIndicator}${task.id} - ${task.title}${statusText}`;
	}

	private async loadTaskOrThrow(id: string): Promise<Task> {
		const task = await this.core.getTask(id);
		if (!task) {
			throw AppError.notFound(`Task not found: ${id}`);
		}
		return task;
	}

	private noTasksFoundMessage(query: string, modifiedFiles?: string[]): CallToolResult {
		return {
			content: [{ type: "text", text: `No tasks found for "${query || modifiedFiles?.join(", ")}".` }],
		};
	}

	private formatSearchResults(tasks: Task[]): CallToolResult {
		const lines: string[] = ["Tasks:"];
		for (const task of tasks) {
			lines.push(this.formatTaskSummaryLine(task, { includeStatus: true }));
		}
		return { content: [{ type: "text", text: lines.join("\n") }] };
	}

	async createTask(args: TaskCreateArgs): Promise<CallToolResult> {
		try {
			const rawOrdinal = (args as { ordinal?: unknown }).ordinal;
			if (rawOrdinal === null) {
				throw AppError.validation("Ordinal must be a non-negative number.");
			}

			const acceptanceCriteria =
				args.acceptanceCriteria
					?.map((text) => String(text).trim())
					.filter((text) => text.length > 0)
					.map((text) => ({ text, checked: false })) ?? undefined;

			const milestone =
				typeof args.milestone === "string" ? await this.resolveMilestoneInput(args.milestone) : undefined;

			const { task: createdTask } = await this.core.createTaskFromInput({
				title: args.title,
				description: args.description,
				status: args.status,
				priority: args.priority,
				...(typeof rawOrdinal === "number" ? { ordinal: rawOrdinal } : {}),
				milestone,
				labels: args.labels,
				assignee: args.assignee,
				dependencies: args.dependencies,
				references: args.references,
				documentation: args.documentation,
				modifiedFiles: args.modifiedFiles,
				parentTaskId: args.parentTaskId,
				finalSummary: args.finalSummary,
				acceptanceCriteria,
				definitionOfDoneAdd: args.definitionOfDoneAdd,
				disableDefinitionOfDoneDefaults: args.disableDefinitionOfDoneDefaults,
				dueDate: args.dueDate,
				deferDate: args.deferDate,
			});

			return await formatTaskCallResult(createdTask);
		} catch (error) {
			if (isCreateLockError(error)) {
				throw AppError.internal(error.message);
			}
			if (error instanceof Error) {
				throw AppError.validation(error.message);
			}
			throw AppError.validation(String(error));
		}
	}

	async listTasks(args: TaskListArgs = {}): Promise<CallToolResult> {
		if (this.isDraftStatus(args.status)) {
			return await this.listDrafts(args);
		}
		return await this.listRegularTasks(args);
	}

	private async listDrafts(args: TaskListArgs): Promise<CallToolResult> {
		let drafts = await this.core.filesystem.listDrafts();
		drafts = await this.filterDraftsBySearch(drafts, args.search);
		drafts = await this.filterDraftsByAssignee(drafts, args.assignee);
		drafts = await this.filterDraftsByMilestone(drafts, args.milestone);
		drafts = this.filterTasksByLabels(drafts, args.labels);

		if (drafts.length === 0) {
			return { content: [{ type: "text", text: "No tasks found." }] };
		}

		let sortedDrafts = sortByOrdinalAndPriority(drafts);
		if (typeof args.limit === "number" && args.limit >= 0) {
			sortedDrafts = sortedDrafts.slice(0, args.limit);
		}
		const lines = ["Draft:"];
		for (const draft of sortedDrafts) {
			lines.push(this.formatTaskSummaryLine(draft));
		}

		return { content: [{ type: "text", text: lines.join("\n") }] };
	}

	private async listRegularTasks(args: TaskListArgs): Promise<CallToolResult> {
		const filters: TaskListFilter = {};
		if (args.status) filters.status = args.status;
		if (args.assignee) filters.assignee = args.assignee;
		if (args.milestone) filters.milestone = args.milestone;

		const tasks = await this.core.queryTasks({
			query: args.search,
			filters: Object.keys(filters).length > 0 ? filters : undefined,
			includeCrossBranch: false,
		});

		const editable = tasks.filter((task) => isLocalEditableTask(task));
		const filteredByLabels = this.filterTasksByLabels(editable, args.labels);

		const contentItems: Array<{ type: "text"; text: string }> = [];

		const duplicates = scanForDuplicateIds(tasks);
		const warning = formatDuplicateWarning(duplicates);
		if (warning) {
			contentItems.push({ type: "text", text: warning });
		}

		if (filteredByLabels.length === 0) {
			contentItems.push({ type: "text", text: "No tasks found." });
			return { content: contentItems };
		}

		const config = await this.core.filesystem.loadConfig();
		const statuses = config?.statuses ?? [];
		const taskOutput = this.buildGroupedTaskOutput(filteredByLabels, statuses, args.limit);

		for (const item of taskOutput) {
			contentItems.push(item);
		}

		if (contentItems.length === 0) {
			contentItems.push({ type: "text", text: "No tasks found." });
		}

		return { content: contentItems };
	}

	private async filterDraftsBySearch(drafts: Task[], search?: string): Promise<Task[]> {
		if (!search) return drafts;
		const draftSearch = createTaskSearchIndex(drafts);
		return draftSearch.search({ query: search, status: "Draft" });
	}

	private async filterDraftsByAssignee(drafts: Task[], assignee?: string): Promise<Task[]> {
		if (!assignee) return drafts;
		return drafts.filter((draft) => (draft.assignee ?? []).includes(assignee));
	}

	private async filterDraftsByMilestone(drafts: Task[], milestone?: string): Promise<Task[]> {
		if (!milestone) return drafts;
		const { active: activeMilestones, archived: archivedMilestones } = await this.core.filesystem.listAllMilestones();
		const resolveMilestoneFilterValue = createMilestoneFilterValueResolver([
			...activeMilestones,
			...archivedMilestones,
		]);
		const milestoneFilter = resolveClosestMilestoneFilterValue(
			milestone,
			drafts.map((draft) => resolveMilestoneFilterValue(draft.milestone ?? "")),
		);
		return drafts.filter(
			(draft) => normalizeMilestoneFilterValue(resolveMilestoneFilterValue(draft.milestone ?? "")) === milestoneFilter,
		);
	}

	private filterTasksByLabels(tasks: Task[], labels?: string[]): Task[] {
		const labelFilters = labels ?? [];
		if (labelFilters.length === 0) return tasks;
		return tasks.filter((task) => {
			const taskLabels = task.labels ?? [];
			return labelFilters.every((label) => taskLabels.includes(label));
		});
	}

	private buildGroupedTaskOutput(
		tasks: Task[],
		statuses: string[],
		limit?: number,
	): Array<{ type: "text"; text: string }> {
		const canonicalByLower = new Map<string, string>();
		for (const status of statuses) {
			canonicalByLower.set(status.toLowerCase(), status);
		}

		const grouped = new Map<string, Task[]>();
		for (const task of tasks) {
			const rawStatus = (task.status ?? "").trim();
			const canonicalStatus = canonicalByLower.get(rawStatus.toLowerCase()) ?? rawStatus;
			const bucketKey = canonicalStatus || "";
			const existing = grouped.get(bucketKey) ?? [];
			existing.push(task);
			grouped.set(bucketKey, existing);
		}

		const orderedStatuses = [
			...statuses.filter((status) => grouped.has(status)),
			...Array.from(grouped.keys()).filter((status) => !statuses.includes(status)),
		];

		const contentItems: Array<{ type: "text"; text: string }> = [];
		let remaining = typeof limit === "number" && limit >= 0 ? limit : undefined;
		for (const status of orderedStatuses) {
			const bucket = grouped.get(status) ?? [];
			const sortedBucket = sortByOrdinalAndPriority(bucket);
			const limitedBucket = remaining !== undefined ? sortedBucket.slice(0, remaining) : sortedBucket;
			if (remaining !== undefined) {
				remaining -= limitedBucket.length;
			}
			if (limitedBucket.length === 0) continue;
			const sectionLines: string[] = [`${status || "No Status"}:`];
			for (const task of limitedBucket) {
				sectionLines.push(this.formatTaskSummaryLine(task));
			}
			contentItems.push({ type: "text", text: sectionLines.join("\n") });
		}

		return contentItems;
	}

	async searchTasks(args: TaskSearchArgs): Promise<CallToolResult> {
		const query = args.query?.trim() ?? "";
		const modifiedFiles = args.modifiedFiles?.map((file) => file.trim()).filter((file) => file.length > 0);
		if (!query && (!modifiedFiles || modifiedFiles.length === 0)) {
			throw AppError.validation("Search query or modifiedFiles filter is required");
		}

		if (this.isDraftStatus(args.status)) {
			const drafts = await this.core.filesystem.listDrafts();
			const searchIndex = createTaskSearchIndex(drafts);
			let matches = searchIndex.search({ query, status: "Draft", priority: args.priority, modifiedFiles });
			if (typeof args.limit === "number" && args.limit >= 0) {
				matches = matches.slice(0, args.limit);
			}
			return matches.length === 0 ? this.noTasksFoundMessage(query, modifiedFiles) : this.formatSearchResults(matches);
		}

		const tasks = await this.core.loadTasks(undefined, undefined, { includeCompleted: true });
		const searchIndex = createTaskSearchIndex(tasks);
		let matches = searchIndex.search({ query, status: args.status, priority: args.priority, modifiedFiles });
		if (typeof args.limit === "number" && args.limit >= 0) {
			matches = matches.slice(0, args.limit);
		}

		const taskResults = matches.filter((task) => isLocalEditableTask(task) && (task.source !== "completed" || task.status === "Archived"));
		return taskResults.length === 0
			? this.noTasksFoundMessage(query, modifiedFiles)
			: this.formatSearchResults(taskResults);
	}

	async viewTask(args: { id: string }): Promise<CallToolResult> {
		const draft = await this.core.filesystem.loadDraft(args.id);
		if (draft) {
			return await formatTaskCallResult(draft);
		}

		const task = await this.core.getTaskWithSubtasks(args.id);
		if (!task) {
			throw AppError.notFound(`Task not found: ${args.id}`);
		}
		return await formatTaskCallResult(task);
	}

	async archiveTask(args: { id: string }): Promise<CallToolResult> {
		const draft = await this.core.filesystem.loadDraft(args.id);
		if (draft) {
			const success = await this.core.archiveDraft(draft.id);
			if (!success) {
				throw AppError.internal(`Failed to archive task: ${args.id}`);
			}

			return await formatTaskCallResult(draft, [`Archived draft ${draft.id}.`]);
		}

		const task = await this.loadTaskOrThrow(args.id);

		if (!isLocalEditableTask(task)) {
			throw AppError.validation(`Cannot archive task from another branch: ${task.id}`);
		}

		const config = await this.core.filesystem.loadConfig();
		const statuses = config?.statuses ?? [];
		const terminalStatuses = config?.terminalStatuses;
		const terminalStatus = getTerminalStatus(statuses, terminalStatuses);
		if (isTerminalStatus(task.status, statuses, terminalStatuses)) {
			throw AppError.validation(
				`Task ${task.id} is ${terminalStatus ?? "Done"}. ${terminalStatus ?? "Done"} tasks should be completed (moved to the completed folder), not archived. Use task_complete instead.`,
			);
		}

		const success = await this.core.archiveTask(task.id);
		if (!success) {
			throw AppError.internal(`Failed to archive task: ${args.id}`);
		}

		const refreshed = (await this.core.getTask(task.id)) ?? task;
		return await formatTaskCallResult(refreshed);
	}

	async completeTask(args: { id: string }): Promise<CallToolResult> {
		const task = await this.loadTaskOrThrow(args.id);

		if (!isLocalEditableTask(task)) {
			throw AppError.validation(`Cannot complete task from another branch: ${task.id}`);
		}

		const config = await this.core.filesystem.loadConfig();
		const statuses = config?.statuses ?? [];
		const terminalStatuses = config?.terminalStatuses;
		const terminalStatus = getTerminalStatus(statuses, terminalStatuses);
		if (!isTerminalStatus(task.status, statuses, terminalStatuses)) {
			throw AppError.validation(
				`Task ${task.id} is not ${terminalStatus ?? "Done"}. Set status to "${terminalStatus ?? "Done"}" with task_edit before completing it.`,
			);
		}

		const filePath = task.filePath ?? null;
		const completedFilePath = filePath ? join(this.core.filesystem.archiveTasksDir, basename(filePath)) : undefined;

		const success = await this.core.completeTask(task.id);
		if (!success) {
			throw AppError.internal(`Failed to complete task: ${args.id}`);
		}

		return await formatTaskCallResult(task, [`Completed task ${task.id}.`], {
			filePathOverride: completedFilePath,
		});
	}

	async demoteTask(args: { id: string }): Promise<CallToolResult> {
		const task = await this.loadTaskOrThrow(args.id);
		let success: boolean;
		try {
			success = await this.core.demoteTask(task.id, false);
		} catch (error) {
			if (isCreateLockError(error)) {
				throw AppError.internal(error.message);
			}
			throw error;
		}
		if (!success) {
			throw AppError.internal(`Failed to demote task: ${args.id}`);
		}

		const refreshed = (await this.core.getTask(task.id)) ?? task;
		return await formatTaskCallResult(refreshed);
	}

	async reorderTask(args: TaskReorderArgs): Promise<CallToolResult> {
		const task = await this.loadTaskOrThrow(args.id);

		const explicitOrdinal = (args as { ordinal?: unknown }).ordinal;
		if (explicitOrdinal === null) {
			throw AppError.validation("Ordinal must be a non-negative number.");
		}

		if (typeof explicitOrdinal === "number") {
			if (!Number.isFinite(explicitOrdinal) || explicitOrdinal < 0) {
				throw AppError.validation("Ordinal must be a non-negative number.");
			}
			const updated = await this.core.editTask(task.id, { ordinal: explicitOrdinal });
			return await formatTaskCallResult(updated);
		}

		const afterId = args.after ? args.after.trim() : undefined;
		const beforeId = args.before ? args.before.trim() : undefined;

		if (!afterId && !beforeId) {
			throw AppError.validation('Specify "after", "before", or "ordinal"');
		}

		const refId = afterId ?? (beforeId as string);
		const refTask = await this.core.getTask(refId);
		if (!refTask) {
			throw AppError.notFound(`Reference task not found: ${refId}`);
		}

		const targetStatus = args.status?.trim() || refTask.status || "To Do";

		const allTasks = await this.core.filesystem.listTasks();
		const statusTasks = allTasks
			.filter((t) => (t.status || "").toLowerCase() === targetStatus.toLowerCase())
			.sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));

		const orderedIds = statusTasks.map((t) => t.id);
		const currentIdx = orderedIds.indexOf(task.id);
		if (currentIdx !== -1) {
			orderedIds.splice(currentIdx, 1);
		}

		const refIdx = orderedIds.indexOf(refId);
		if (refIdx === -1) {
			throw AppError.validation(`Reference task ${refId} not found in status "${targetStatus}".`);
		}

		const insertAt = afterId ? refIdx + 1 : refIdx;
		orderedIds.splice(insertAt, 0, task.id);

		try {
			const { updatedTask } = await this.core.reorderTask({
				taskId: task.id,
				targetStatus,
				orderedTaskIds: orderedIds,
			});
			return await formatTaskCallResult(updatedTask);
		} catch (error) {
			if (error instanceof Error) {
				throw AppError.validation(error.message);
			}
			throw AppError.validation(String(error));
		}
	}

	async editTask(args: TaskEditRequest): Promise<CallToolResult> {
		try {
			const rawOrdinal = (args as { ordinal?: unknown }).ordinal;
			if (rawOrdinal === null) {
				throw AppError.validation("Ordinal must be a non-negative number.");
			}

			const updateInput = buildTaskUpdateInput(args);
			if (typeof updateInput.milestone === "string") {
				updateInput.milestone = await this.resolveMilestoneInput(updateInput.milestone);
			}
			const updatedTask = await this.core.editTaskOrDraft(args.id, updateInput);
			return await formatTaskCallResult(updatedTask);
		} catch (error) {
			if (error instanceof Error) {
				throw AppError.validation(error.message);
			}
			throw AppError.validation(String(error));
		}
	}
}

export type TaskReorderArgs = {
	id: string;
	after?: string;
	before?: string;
	ordinal?: number;
	status?: string;
};

export type { TaskEditArgs, TaskEditRequest };
