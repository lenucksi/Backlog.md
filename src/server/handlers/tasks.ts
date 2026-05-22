import { isCreateLockError } from "../../file-system/operations.ts";
import type { SearchResultType } from "../../types/index.ts";
import { labelsToLower } from "../../utils/label-filter.ts";
import type { ServerHandlerContext } from "../types.ts";
import {
	buildSearchFilters,
	buildTaskUpdateInputFromBody,
	ensurePrefix,
	findTaskByLooseId,
	parseMultiParam,
} from "../utils.ts";

export function createTaskHandlers(ctx: ServerHandlerContext) {
	async function handleListTasks(req: Request): Promise<Response> {
		const url = new URL(req.url);
		const status = url.searchParams.get("status") || undefined;
		const assignee = url.searchParams.get("assignee") || undefined;
		const parent = url.searchParams.get("parent") || undefined;
		const priorityParam = url.searchParams.get("priority") || undefined;
		const crossBranch = url.searchParams.get("crossBranch") === "true";
		const labels = labelsToLower(parseMultiParam(url, "label", "labels"));

		let priority: "high" | "medium" | "low" | undefined;
		if (priorityParam) {
			const normalizedPriority = priorityParam.toLowerCase();
			const allowed = ["high", "medium", "low"];
			if (!allowed.includes(normalizedPriority)) {
				return Response.json({ error: "Invalid priority filter" }, { status: 400 });
			}
			priority = normalizedPriority as "high" | "medium" | "low";
		}

		let parentTaskId: string | undefined;
		if (parent) {
			const store = await ctx.getContentStore();
			const allTasks = store.getTasks();
			let parentTask = findTaskByLooseId(allTasks, parent);
			if (!parentTask) {
				const fallbackId = ensurePrefix(parent);
				const fallback = await ctx.core.filesystem.loadTask(fallbackId);
				if (fallback) {
					store.upsertTask(fallback);
					parentTask = fallback;
				}
			}
			if (!parentTask) {
				const normalizedParent = ensurePrefix(parent);
				return Response.json({ error: `Parent task ${normalizedParent} not found` }, { status: 404 });
			}
			parentTaskId = parentTask.id;
		}

		const tasks = await ctx.core.queryTasks({
			filters: { status, assignee, priority, parentTaskId, labels: labels.length > 0 ? labels : undefined },
			includeCrossBranch: crossBranch,
		});

		return Response.json(tasks);
	}

	async function handleSearch(req: Request): Promise<Response> {
		try {
			const searchService = await ctx.getSearchService();
			const url = new URL(req.url);
			const query = url.searchParams.get("query") ?? undefined;

			const limitParam = url.searchParams.get("limit");
			let limit: number | undefined;
			if (limitParam) {
				const parsed = Number.parseInt(limitParam, 10);
				if (Number.isNaN(parsed) || parsed <= 0) {
					return Response.json({ error: "limit must be a positive integer" }, { status: 400 });
				}
				limit = parsed;
			}

			const typeParams = [...url.searchParams.getAll("type"), ...url.searchParams.getAll("types")];
			let types: SearchResultType[] | undefined;
			if (typeParams.length > 0) {
				const allowed: SearchResultType[] = ["task", "document", "decision"];
				const normalizedTypes = typeParams
					.map((value) => value.toLowerCase())
					.filter((value): value is SearchResultType => {
						return allowed.includes(value as SearchResultType);
					});
				if (normalizedTypes.length === 0) {
					return Response.json({ error: "type must be task, document, or decision" }, { status: 400 });
				}
				types = normalizedTypes;
			}

			const assigneeParamsRaw = parseMultiParam(url, "assignee", "assignees");
			const labelParamsRaw = labelsToLower(parseMultiParam(url, "label", "labels"));
			const modifiedFileParamsRaw = parseMultiParam(url, "modifiedFile", "modifiedFiles");
			const statusParams = url.searchParams.getAll("status");
			const priorityParamsRaw = url.searchParams.getAll("priority");

			const filterResult = buildSearchFilters(
				statusParams,
				priorityParamsRaw,
				assigneeParamsRaw,
				labelParamsRaw,
				modifiedFileParamsRaw,
			);
			if (filterResult.error) return filterResult.error;

			const results = searchService.search({
				query,
				limit,
				types,
				filters: filterResult.filters,
			});
			return Response.json(results);
		} catch (error) {
			console.error("Error performing search:", error);
			return Response.json({ error: "Search failed" }, { status: 500 });
		}
	}

	async function handleCreateTask(req: Request): Promise<Response> {
		const payload = await req.json();

		if (!payload || typeof payload.title !== "string" || payload.title.trim().length === 0) {
			return Response.json({ error: "Title is required" }, { status: 400 });
		}

		const acceptanceCriteria = Array.isArray(payload.acceptanceCriteriaItems)
			? payload.acceptanceCriteriaItems
					.map((item: { text?: string; checked?: boolean }) => ({
						text: String(item?.text ?? "").trim(),
						checked: Boolean(item?.checked),
					}))
					.filter((item: { text: string }) => item.text.length > 0)
			: [];
		const definitionOfDoneAdd = Array.isArray(payload.definitionOfDoneAdd)
			? payload.definitionOfDoneAdd
					.map((item: unknown) => String(item ?? "").trim())
					.filter((item: string) => item.length > 0)
			: [];
		const disableDefinitionOfDoneDefaults = Boolean(payload.disableDefinitionOfDoneDefaults);

		try {
			const milestone =
				typeof payload.milestone === "string" ? await ctx.resolveMilestoneInput(payload.milestone) : undefined;

			const { task: createdTask } = await ctx.core.createTaskFromInput({
				title: payload.title,
				description: payload.description,
				status: payload.status,
				priority: payload.priority,
				milestone,
				labels: payload.labels,
				assignee: payload.assignee,
				dependencies: payload.dependencies,
				references: payload.references,
				modifiedFiles: payload.modifiedFiles,
				parentTaskId: payload.parentTaskId,
				implementationPlan: payload.implementationPlan,
				implementationNotes: payload.implementationNotes,
				finalSummary: payload.finalSummary,
				acceptanceCriteria,
				definitionOfDoneAdd,
				disableDefinitionOfDoneDefaults,
			});
			return Response.json(createdTask, { status: 201 });
		} catch (error) {
			if (isCreateLockError(error)) {
				const message = error instanceof Error ? error.message : "Failed to create task";
				return Response.json({ error: message }, { status: 409 });
			}
			const message = error instanceof Error ? error.message : "Failed to create task";
			return Response.json({ error: message }, { status: 400 });
		}
	}

	async function handleGetTask(taskId: string): Promise<Response> {
		const store = await ctx.getContentStore();

		const localTask = await ctx.core.filesystem.loadTask(taskId);
		if (localTask) {
			store.upsertTask(localTask);
			return Response.json(localTask);
		}

		const task = findTaskByLooseId(store.getTasks(), taskId);
		if (task) {
			return Response.json(task);
		}

		return Response.json({ error: "Task not found" }, { status: 404 });
	}

	async function handleUpdateTask(req: Request, taskId: string): Promise<Response> {
		const updates = await req.json();
		const existingTask = await ctx.core.filesystem.loadTask(taskId);
		if (!existingTask) {
			return Response.json({ error: "Task not found" }, { status: 404 });
		}

		const updateInput = buildTaskUpdateInputFromBody(updates);

		if ("milestone" in updates && (typeof updates.milestone === "string" || updates.milestone === null)) {
			if (typeof updates.milestone === "string") {
				updateInput.milestone = await ctx.resolveMilestoneInput(updates.milestone);
			} else {
				updateInput.milestone = updates.milestone;
			}
		}

		try {
			const updatedTask = await ctx.core.updateTaskFromInput(taskId, updateInput);
			return Response.json(updatedTask);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to update task";
			return Response.json({ error: message }, { status: 400 });
		}
	}

	async function handleDeleteTask(taskId: string): Promise<Response> {
		const success = await ctx.core.archiveTask(taskId);
		if (!success) {
			return Response.json({ error: "Task not found" }, { status: 404 });
		}
		return Response.json({ success: true });
	}

	async function handleCompleteTask(taskId: string): Promise<Response> {
		try {
			const task = await ctx.core.filesystem.loadTask(taskId);
			if (!task) {
				return Response.json({ error: "Task not found" }, { status: 404 });
			}

			const success = await ctx.core.completeTask(taskId);
			if (!success) {
				return Response.json({ error: "Failed to complete task" }, { status: 500 });
			}

			ctx.broadcastTasksUpdated();
			return Response.json({ success: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to complete task";
			console.error("Error completing task:", error);
			return Response.json({ error: message }, { status: 500 });
		}
	}

	async function handleReorderTask(req: Request): Promise<Response> {
		try {
			const body = await req.json();
			const taskId = typeof body.taskId === "string" ? body.taskId : "";
			const targetStatus = typeof body.targetStatus === "string" ? body.targetStatus : "";
			const orderedTaskIds = Array.isArray(body.orderedTaskIds) ? body.orderedTaskIds : [];
			const targetMilestone =
				typeof body.targetMilestone === "string"
					? body.targetMilestone
					: body.targetMilestone === null
						? null
						: undefined;

			if (!taskId || !targetStatus || orderedTaskIds.length === 0) {
				return Response.json(
					{ error: "Missing required fields: taskId, targetStatus, and orderedTaskIds" },
					{ status: 400 },
				);
			}

			const { updatedTask } = await ctx.core.reorderTask({
				taskId,
				targetStatus,
				orderedTaskIds,
				targetMilestone,
				commitMessage: `Reorder tasks in ${targetStatus}`,
			});

			return Response.json({ success: true, task: updatedTask });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to reorder task";
			const isCrossBranchError = message.includes("exists in branch");
			const isValidationError = message.includes("not found") || message.includes("Missing required");
			const status = isCrossBranchError || isValidationError ? 400 : 500;
			if (status === 500) {
				console.error("Error reordering task:", error);
			}
			return Response.json({ error: message }, { status });
		}
	}

	async function handleDemoteTask(taskId: string): Promise<Response> {
		try {
			const task = await ctx.core.getTask(taskId);
			if (!task) {
				return Response.json({ error: "Task not found" }, { status: 404 });
			}
			await ctx.core.demoteTask(taskId);
			ctx.broadcastTasksUpdated();
			return Response.json({ success: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to demote task";
			return Response.json({ error: message }, { status: 500 });
		}
	}

	async function handleCleanupPreview(req: Request): Promise<Response> {
		try {
			const url = new URL(req.url);
			const ageParam = url.searchParams.get("age");

			if (!ageParam) {
				return Response.json({ error: "Missing age parameter" }, { status: 400 });
			}

			const age = Number.parseInt(ageParam, 10);
			if (Number.isNaN(age) || age < 0) {
				return Response.json({ error: "Invalid age parameter" }, { status: 400 });
			}

			const tasksToCleanup = await ctx.core.getTerminalStatusTasksByAge(age);

			const preview = tasksToCleanup.map((task) => ({
				id: task.id,
				title: task.title,
				updatedDate: task.updatedDate,
				createdDate: task.createdDate,
			}));

			return Response.json({
				count: preview.length,
				tasks: preview,
			});
		} catch (error) {
			console.error("Error getting cleanup preview:", error);
			return Response.json({ error: "Failed to get cleanup preview" }, { status: 500 });
		}
	}

	async function handleCleanupExecute(req: Request): Promise<Response> {
		try {
			const { age } = await req.json();

			if (age === undefined || age === null) {
				return Response.json({ error: "Missing age parameter" }, { status: 400 });
			}

			const ageInDays = Number.parseInt(age, 10);
			if (Number.isNaN(ageInDays) || ageInDays < 0) {
				return Response.json({ error: "Invalid age parameter" }, { status: 400 });
			}

			const tasksToCleanup = await ctx.core.getTerminalStatusTasksByAge(ageInDays);

			if (tasksToCleanup.length === 0) {
				return Response.json({
					success: true,
					movedCount: 0,
					message: "No tasks to clean up",
				});
			}

			let successCount = 0;
			const failedTasks: string[] = [];

			for (const task of tasksToCleanup) {
				try {
					const success = await ctx.core.completeTask(task.id);
					if (success) {
						successCount++;
					} else {
						failedTasks.push(task.id);
					}
				} catch (error) {
					console.error(`Failed to complete task ${task.id}:`, error);
					failedTasks.push(task.id);
				}
			}

			ctx.broadcastTasksUpdated();

			return Response.json({
				success: true,
				movedCount: successCount,
				totalCount: tasksToCleanup.length,
				failedTasks: failedTasks.length > 0 ? failedTasks : undefined,
				message: `Moved ${successCount} of ${tasksToCleanup.length} tasks to completed folder`,
			});
		} catch (error) {
			console.error("Error executing cleanup:", error);
			return Response.json({ error: "Failed to execute cleanup" }, { status: 500 });
		}
	}

	async function handleGetSequences(): Promise<Response> {
		const data = await ctx.core.listActiveSequences();
		return Response.json(data);
	}

	async function handleMoveSequence(req: Request): Promise<Response> {
		try {
			const body = await req.json();
			const taskId = String(body.taskId || "").trim();
			const moveToUnsequenced = Boolean(body.unsequenced === true);
			const targetSequenceIndex = body.targetSequenceIndex !== undefined ? Number(body.targetSequenceIndex) : undefined;

			if (!taskId) return Response.json({ error: "taskId is required" }, { status: 400 });

			const next = await ctx.core.moveTaskInSequences({
				taskId,
				unsequenced: moveToUnsequenced,
				targetSequenceIndex,
			});
			return Response.json(next);
		} catch (error) {
			const message = (error as Error)?.message || "Invalid request";
			return Response.json({ error: message }, { status: 400 });
		}
	}

	async function handleListCompletedTasks(): Promise<Response> {
		try {
			const tasks = await ctx.core.filesystem.listCompletedTasks();
			return Response.json(tasks);
		} catch (error) {
			console.error("Error listing completed tasks:", error);
			return Response.json([]);
		}
	}

	async function handleReopenTask(taskId: string): Promise<Response> {
		try {
			const success = await ctx.core.filesystem.reopenTask(taskId);
			if (!success) {
				return Response.json({ error: "Task not found in completed" }, { status: 404 });
			}
			ctx.broadcastTasksUpdated();
			return Response.json({ success: true });
		} catch (error) {
			console.error("Error reopening task:", error);
			return Response.json({ error: "Failed to reopen task" }, { status: 500 });
		}
	}

	return {
		handleListTasks,
		handleSearch,
		handleCreateTask,
		handleGetTask,
		handleUpdateTask,
		handleDeleteTask,
		handleCompleteTask,
		handleDemoteTask,
		handleReorderTask,
		handleCleanupPreview,
		handleCleanupExecute,
		handleGetSequences,
		handleMoveSequence,
		handleListCompletedTasks,
		handleReopenTask,
	};
}
