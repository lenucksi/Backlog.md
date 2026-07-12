import * as clack from "@clack/prompts";
import type { Command } from "commander";
import picocolors from "picocolors";
import { Core } from "../core/backlog.ts";
import { formatTaskPlainText } from "../formatters/task-plain-text.ts";
import { resolveLabelColor, type Task, type TaskListFilter } from "../types/index.ts";
import type { TaskEditArgs } from "../types/task-edit-args.ts";
import { viewTaskEnhanced } from "../ui/task-viewer-with-search.ts";
import { colorizeLabel } from "../utils/ansi.ts";
import { AppError } from "../utils/app-error.ts";
import {
	createMultiValueAccumulator,
	hasInteractiveTTY,
	printMissingRequiredArgument,
	requireProjectRoot,
	shouldAutoPlain,
} from "../utils/cli-context.ts";
import { createMilestoneFilterValueResolver, resolveClosestMilestoneFilterValue } from "../utils/milestone-filter.ts";
import { resolveMilestoneInputForStorage } from "../utils/milestone-storage.ts";
import { applyOutputOptions, getOutputMode, stdout } from "../utils/output.ts";
import { formatValidStatuses, getCanonicalStatus, getValidStatuses } from "../utils/status.ts";
import {
	normalizeDependencies,
	parseDelimitedStringList,
	parsePositiveIndexList,
	processAcceptanceCriteriaOptions,
	toStringArray,
} from "../utils/task-builders.ts";
import { buildTaskUpdateInput } from "../utils/task-edit-builder.ts";
import { normalizeTaskId, taskIdsEqual } from "../utils/task-path.ts";
import { sortTasks } from "../utils/task-sorting.ts";
import { getTerminalStatus, isTerminalStatus } from "../utils/terminal-status.ts";
import { pickTaskForEditWizard, runTaskCreateWizard, runTaskEditWizard } from "./task-wizard.ts";

function renderChecklist(items: Array<{ text: string; checked: boolean }> | undefined, emptyMsg: string): void {
	if (!items?.length) {
		stdout(picocolors.dim(emptyMsg));
		return;
	}
	for (const item of items) {
		const prefix = item.checked ? picocolors.green("[x]") : picocolors.yellow("[ ]");
		stdout(`  ${prefix} ${item.text}`);
	}
}

function hasCreateFieldFlags(options: Record<string, unknown>): boolean {
	return Boolean(
		options.description !== undefined ||
			options.desc !== undefined ||
			options.assignee !== undefined ||
			options.status !== undefined ||
			options.labels !== undefined ||
			options.priority !== undefined ||
			options.ordinal !== undefined ||
			options.milestone !== undefined ||
			options.plain ||
			options.ac !== undefined ||
			options.acceptanceCriteria !== undefined ||
			options.dod !== undefined ||
			options.dodDefaults === false ||
			options.plan !== undefined ||
			options.notes !== undefined ||
			options.finalSummary !== undefined ||
			options.draft ||
			options.parent !== undefined ||
			options.dependsOn !== undefined ||
			options.dep !== undefined ||
			options.ref !== undefined ||
			options.doc !== undefined ||
			options.modifiedFile !== undefined,
	);
}

function hasEditFieldFlags(options: Record<string, unknown>): boolean {
	return Boolean(
		options.title !== undefined ||
			options.description !== undefined ||
			options.desc !== undefined ||
			options.assignee !== undefined ||
			options.status !== undefined ||
			options.label !== undefined ||
			options.priority !== undefined ||
			options.ordinal !== undefined ||
			options.milestone !== undefined ||
			options.clearMilestone ||
			options.plain ||
			options.addLabel !== undefined ||
			options.removeLabel !== undefined ||
			options.clearLabels ||
			options.ac !== undefined ||
			options.dod !== undefined ||
			options.removeAc !== undefined ||
			options.removeDod !== undefined ||
			options.checkAc !== undefined ||
			options.checkDod !== undefined ||
			options.uncheckAc !== undefined ||
			options.uncheckDod !== undefined ||
			options.acceptanceCriteria !== undefined ||
			options.plan !== undefined ||
			options.notes !== undefined ||
			options.finalSummary !== undefined ||
			options.appendNotes !== undefined ||
			options.appendFinalSummary !== undefined ||
			options.clearFinalSummary ||
			options.dependsOn !== undefined ||
			options.dep !== undefined ||
			options.ref !== undefined ||
			options.doc !== undefined ||
			options.modifiedFile !== undefined,
	);
}

async function resolveCliMilestoneInput(core: Core, milestone: string): Promise<string> {
	const { active: activeMilestones, archived: archivedMilestones } = await core.filesystem.listAllMilestones();
	return resolveMilestoneInputForStorage(milestone, activeMilestones, archivedMilestones);
}

async function handleTaskCreateCommand(title: string | undefined, options: Record<string, unknown>) {
	applyOutputOptions(options);
	const shouldUseWizard = hasInteractiveTTY() && title === undefined && !hasCreateFieldFlags(options);
	if (!shouldUseWizard && (title === undefined || title.trim().length === 0)) {
		printMissingRequiredArgument("title");
		return;
	}

	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	await core.ensureConfigLoaded();

	if (shouldUseWizard) {
		const statuses = await getValidStatuses(core);
		const wizardInput = await runTaskCreateWizard({ statuses });
		if (!wizardInput) {
			clack.cancel("Task create cancelled.");
			return;
		}
		try {
			const { task, filePath } = await core.createTaskFromInput(wizardInput);
			stdout(`Created task ${task.id}`);
			if (filePath) {
				stdout(`File: ${filePath}`);
			}
		} catch (error) {
			console.error(AppError.formatCLIError(error));
			process.exitCode = 1;
		}
		return;
	}

	const createAsDraft = Boolean(options.draft);
	let ordinalValue: number | undefined;

	if (options.ordinal !== undefined) {
		const parsed = Number(options.ordinal);
		if (!Number.isFinite(parsed) || parsed < 0) {
			console.error(`Invalid ordinal: ${options.ordinal}. Must be a non-negative number.`);
			process.exitCode = 1;
			return;
		}
		ordinalValue = parsed;
	}

	try {
		const criteria = processAcceptanceCriteriaOptions(options);
		const milestone =
			typeof options.milestone === "string" ? await resolveCliMilestoneInput(core, options.milestone) : undefined;
		const { task, filePath } = await core.createTaskFromInput({
			title: title ?? "",
			description: options.description || options.desc ? String(options.description || options.desc) : undefined,
			status: createAsDraft ? "Draft" : options.status ? String(options.status) : undefined,
			assignee: options.assignee ? [String(options.assignee)] : undefined,
			labels: parseDelimitedStringList(options.labels),
			dependencies:
				options.dependsOn || options.dep ? normalizeDependencies(options.dependsOn || options.dep) : undefined,
			references: parseDelimitedStringList(options.ref),
			documentation: parseDelimitedStringList(options.doc),
			modifiedFiles: parseDelimitedStringList(options.modifiedFile),
			parentTaskId: options.parent ? String(options.parent) : undefined,
			priority: options.priority ? (String(options.priority).toLowerCase() as "high" | "medium" | "low") : undefined,
			...(ordinalValue !== undefined ? { ordinal: ordinalValue } : {}),
			milestone,
			implementationPlan: options.plan ? String(options.plan) : undefined,
			implementationNotes: options.notes ? String(options.notes) : undefined,
			finalSummary: options.finalSummary ? String(options.finalSummary) : undefined,
			dueDate: options.dueDate ? String(options.dueDate) : undefined,
			deferDate: options.deferDate ? String(options.deferDate) : undefined,
			acceptanceCriteria: criteria.map((text) => ({ text, checked: false })),
			definitionOfDoneAdd: toStringArray(options.dod),
			disableDefinitionOfDoneDefaults: options.dodDefaults === false,
		});

		if (getOutputMode() === "plain") {
			stdout(task, (d) => formatTaskPlainText(d as Task, { filePathOverride: filePath }));
			return;
		}

		if (createAsDraft) {
			stdout(`Created draft ${task.id}`);
			if (filePath) stdout(`File: ${filePath}`);
			return;
		}

		stdout(`Created task ${task.id}`);
		if (filePath) stdout(`File: ${filePath}`);
	} catch (error) {
		console.error(AppError.formatCLIError(error));
		process.exitCode = 1;
	}
}

async function handleTaskListCommand(options: Record<string, unknown>) {
	applyOutputOptions(options);
	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	const cleanup = () => {
		core.disposeSearchService();
		core.disposeContentStore();
	};
	const baseFilters: TaskListFilter = {};
	if (options.status) {
		baseFilters.status = String(options.status);
	}
	if (options.assignee) {
		baseFilters.assignee = String(options.assignee);
	}
	if (options.milestone) {
		baseFilters.milestone = String(options.milestone);
	}
	if (options.priority) {
		const priorityLower = String(options.priority).toLowerCase();
		const validPriorities = ["high", "medium", "low"] as const;
		if (!validPriorities.includes(priorityLower as (typeof validPriorities)[number])) {
			console.error(`Invalid priority: ${options.priority}. Valid values are: high, medium, low`);
			process.exitCode = 1;
			cleanup();
			return;
		}
		baseFilters.priority = priorityLower as (typeof validPriorities)[number];
	}

	let parentId: string | undefined;
	if (options.parent) {
		const parentInput = String(options.parent);
		parentId = normalizeTaskId(parentInput);
		baseFilters.parentTaskId = parentInput;
	}

	if (options.sort) {
		const validSortFields = ["priority", "id", "ordinal", "created", "due"];
		const sortField = String(options.sort).toLowerCase();
		if (!validSortFields.includes(sortField)) {
			console.error(`Invalid sort field: ${options.sort}. Valid values are: priority, id, ordinal, created, due`);
			process.exitCode = 1;
			cleanup();
			return;
		}
	}

	const applyDateFilters = (tasks: Task[]): Task[] => {
		const now = new Date();
		let filtered = tasks;
		if (options.overdue) {
			filtered = filtered.filter((t) => t.dueDate && new Date(t.dueDate) < now);
		}
		if (options.dueSoon) {
			const days = Number(options.dueSoon);
			if (!Number.isFinite(days) || days < 0) {
				console.error(`Invalid --due-soon value: ${options.dueSoon}. Must be a non-negative number.`);
				process.exitCode = 1;
				return [];
			}
			const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
			filtered = filtered.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= cutoff);
		}
		if (options.deferred) {
			filtered = filtered.filter((t) => t.deferDate && new Date(t.deferDate) > now);
		}
		return filtered;
	};

	const mode = getOutputMode();
	const usePlainOutput =
		mode === "plain" ||
		(mode === "auto" && (shouldAutoPlain() || Boolean(options.overdue || options.dueSoon || options.deferred)));

	const tasks = await core.queryTasks({ filters: baseFilters, includeCrossBranch: false });

	if (mode === "json") {
		const filtered = applyDateFilters(tasks).filter((task) => {
			if (parentId) return task.parentTaskId && taskIdsEqual(parentId, task.parentTaskId);
			return true;
		});
		stdout(filtered);
		cleanup();
		return;
	}

	if (usePlainOutput) {
		const config = await core.filesystem.loadConfig();

		if (parentId) {
			const parentExists = (await core.queryTasks({ includeCrossBranch: false })).some((task) =>
				taskIdsEqual(parentId, task.id),
			);
			if (!parentExists) {
				console.error(`Parent task ${parentId} not found.`);
				process.exitCode = 1;
				cleanup();
				return;
			}
		}

		let sortedTasks = tasks;
		if (options.sort) {
			const validSortFields = ["priority", "id", "ordinal", "created", "due"];
			const sortField = String(options.sort).toLowerCase();
			if (!validSortFields.includes(sortField)) {
				console.error(`Invalid sort field: ${options.sort}. Valid values are: priority, id, ordinal, created, due`);
				process.exitCode = 1;
				cleanup();
				return;
			}
			sortedTasks = sortTasks(tasks, sortField);
		} else {
			sortedTasks = sortTasks(tasks, "priority");
		}

		let filtered = sortedTasks;
		if (parentId) {
			filtered = filtered.filter((task) => task.parentTaskId && taskIdsEqual(parentId, task.parentTaskId));
		}
		filtered = applyDateFilters(filtered);
		if (options.overdue || options.dueSoon || options.deferred) {
			if (process.exitCode) return;
		}

		if (filtered.length === 0) {
			if (options.parent) {
				const canonicalParent = normalizeTaskId(String(options.parent));
				stdout(`No child tasks found for parent task ${canonicalParent}.`);
			} else {
				stdout("No tasks found.");
			}
			cleanup();
			return;
		}

		if (options.sort && String(options.sort).toLowerCase() === "priority") {
			const sortedByPriority = sortTasks(filtered, "priority");
			stdout("Tasks (sorted by priority):");
			for (const t of sortedByPriority) {
				const priorityIndicator = t.priority ? `[${t.priority.toUpperCase()}] ` : "";
				const statusIndicator = t.status ? ` (${t.status})` : "";
				stdout(`  ${priorityIndicator}${t.id} - ${t.title}${statusIndicator}`);
			}
			cleanup();
			return;
		}

		const canonicalByLower = new Map<string, string>();
		const statuses = config?.statuses || [];
		for (const status of statuses) {
			canonicalByLower.set(status.toLowerCase(), status);
		}

		const groups = new Map<string, Task[]>();
		for (const task of filtered) {
			const rawStatus = (task.status || "").trim();
			const canonicalStatus = canonicalByLower.get(rawStatus.toLowerCase()) || rawStatus;
			const list = groups.get(canonicalStatus) || [];
			list.push(task);
			groups.set(canonicalStatus, list);
		}

		const orderedStatuses = [
			...statuses.filter((status) => groups.has(status)),
			...Array.from(groups.keys()).filter((status) => !statuses.includes(status)),
		];

		for (const status of orderedStatuses) {
			const list = groups.get(status);
			if (!list) continue;
			let sortedList = list;
			if (options.sort) {
				sortedList = sortTasks(list, String(options.sort).toLowerCase());
			}
			stdout(`${status || "No Status"}:`);
			sortedList.forEach((task) => {
				const priorityIndicator = task.priority ? `[${task.priority.toUpperCase()}] ` : "";
				stdout(`  ${priorityIndicator}${task.id} - ${task.title}`);
			});
			stdout("");
		}
		cleanup();
		return;
	}

	let filterDescription = "";
	let title = "Tasks";
	const activeFilters: string[] = [];
	if (options.status) activeFilters.push(`Status: ${options.status}`);
	if (options.assignee) activeFilters.push(`Assignee: ${options.assignee}`);
	if (options.parent) {
		activeFilters.push(`Parent: ${normalizeTaskId(String(options.parent))}`);
	}
	if (options.milestone) activeFilters.push(`Milestone: ${options.milestone}`);
	if (options.priority) activeFilters.push(`Priority: ${options.priority}`);
	if (options.sort) activeFilters.push(`Sort: ${options.sort}`);

	if (activeFilters.length > 0) {
		filterDescription = activeFilters.join(", ");
		title = `Tasks (${activeFilters.join(" • ")})`;
	}
	const initialUnifiedFilter: {
		status?: string;
		assignee?: string;
		milestone?: string;
		priority?: string;
		sort?: string;
		title?: string;
		filterDescription?: string;
		parentTaskId?: string;
	} = {
		status: options.status as string | undefined,
		assignee: options.assignee as string | undefined,
		milestone: options.milestone as string | undefined,
		priority: options.priority as string | undefined,
		sort: options.sort as string | undefined,
		title,
		filterDescription,
		parentTaskId: parentId,
	};

	const { runUnifiedView } = await import("../ui/unified-view.ts");
	const interactiveLoaderFilters: TaskListFilter = {};
	if (options.assignee) {
		interactiveLoaderFilters.assignee = options.assignee as string;
	}
	if (parentId) {
		interactiveLoaderFilters.parentTaskId = parentId;
	}
	await runUnifiedView({
		core,
		initialView: "task-list",
		tasksLoader: async (updateProgress) => {
			updateProgress("Loading configuration...");
			const config = await core.filesystem.loadConfig();

			await core.loadTasks((msg) => {
				updateProgress(msg);
			});

			updateProgress("Applying filters...");
			const [tasks, allTasksForParentCheck] = await Promise.all([
				core.queryTasks({
					filters: Object.keys(interactiveLoaderFilters).length > 0 ? interactiveLoaderFilters : undefined,
				}),
				parentId ? core.queryTasks() : Promise.resolve(undefined),
			]);

			if (parentId && allTasksForParentCheck) {
				const parentExists = allTasksForParentCheck.some((task) => taskIdsEqual(parentId, task.id));
				if (!parentExists) {
					throw AppError.notFound(`Parent task ${parentId} not found.`);
				}
			}

			let sortedTasks = tasks;
			if (options.sort) {
				const validSortFields = ["priority", "id", "ordinal", "created", "due"];
				const sortField = String(options.sort).toLowerCase();
				if (!validSortFields.includes(sortField)) {
					throw AppError.validation(
						`Invalid sort field: ${options.sort}. Valid values are: priority, id, ordinal, created, due`,
					);
				}
				sortedTasks = sortTasks(tasks, sortField);
			} else {
				sortedTasks = sortTasks(tasks, "priority");
			}

			let filtered = sortedTasks;
			if (parentId) {
				filtered = filtered.filter((task) => task.parentTaskId && taskIdsEqual(parentId, task.parentTaskId));
			}

			if (options.milestone && filtered.length > 0) {
				const [activeMilestones, archivedMilestones] = await Promise.all([
					core.filesystem.listMilestones(),
					core.filesystem.listArchivedMilestones(),
				]);
				const resolveMilestoneFilterValue = createMilestoneFilterValueResolver([
					...activeMilestones,
					...archivedMilestones,
				]);
				const resolvedMilestone = resolveClosestMilestoneFilterValue(
					options.milestone as string,
					filtered.map((task) => resolveMilestoneFilterValue(task.milestone ?? "")),
				);
				if (resolvedMilestone) {
					initialUnifiedFilter.milestone = resolvedMilestone;
				}
			}

			return {
				tasks: filtered,
				statuses: config?.statuses || [],
			};
		},
		filter: initialUnifiedFilter,
	});
	cleanup();
}

async function handleTaskEditCommand(taskId: string | undefined, options: Record<string, unknown>) {
	applyOutputOptions(options);
	const shouldUseWizard = hasInteractiveTTY() && !hasEditFieldFlags(options);
	if (!shouldUseWizard && !taskId) {
		printMissingRequiredArgument("taskId");
		return;
	}

	const cwd = await requireProjectRoot();
	const core = new Core(cwd);

	if (shouldUseWizard) {
		let selectedTaskId = taskId ? normalizeTaskId(taskId) : undefined;
		if (!selectedTaskId) {
			const localTasks = await core.queryTasks({ includeCrossBranch: false });
			const taskOptions = localTasks.map((candidate) => ({
				id: candidate.id,
				title: candidate.title,
			}));
			if (taskOptions.length === 0) {
				stdout("No tasks found.");
				return;
			}
			selectedTaskId = await pickTaskForEditWizard({ tasks: taskOptions });
			if (!selectedTaskId) {
				clack.cancel("Task edit cancelled.");
				return;
			}
		}

		const existingTaskForWizard = await core.loadTaskById(selectedTaskId);
		if (!existingTaskForWizard) {
			console.error(`Task ${selectedTaskId} not found.`);
			process.exitCode = 1;
			return;
		}

		const statuses = await getValidStatuses(core);
		const wizardInput = await runTaskEditWizard({ task: existingTaskForWizard, statuses });
		if (!wizardInput) {
			clack.cancel("Task edit cancelled.");
			return;
		}

		try {
			const updatedTask = await core.editTask(existingTaskForWizard.id, wizardInput);
			stdout(`Updated task ${updatedTask.id}`);
		} catch (error) {
			console.error(AppError.formatCLIError(error));
			process.exitCode = 1;
		}
		return;
	}

	await core.ensureConfigLoaded();

	const canonicalId = normalizeTaskId(taskId ?? "");
	const existingTask = await core.loadTaskById(canonicalId);

	if (!existingTask) {
		console.error(`Task ${taskId} not found.`);
		process.exitCode = 1;
		return;
	}

	let canonicalStatus: string | undefined;
	if (options.status) {
		const canonical = await getCanonicalStatus(String(options.status), core);
		if (!canonical) {
			const configuredStatuses = await getValidStatuses(core);
			console.error(
				`Invalid status: ${options.status}. Valid statuses are: ${formatValidStatuses(configuredStatuses)}`,
			);
			process.exitCode = 1;
			return;
		}
		canonicalStatus = canonical;
	}

	let normalizedPriority: "high" | "medium" | "low" | undefined;
	if (options.priority) {
		const priority = String(options.priority).toLowerCase();
		const validPriorities = ["high", "medium", "low"] as const;
		if (!validPriorities.includes(priority as (typeof validPriorities)[number])) {
			console.error(`Invalid priority: ${priority}. Valid values are: high, medium, low`);
			process.exitCode = 1;
			return;
		}
		normalizedPriority = priority as "high" | "medium" | "low";
	}

	let ordinalValue: number | undefined;
	if (options.ordinal !== undefined) {
		const parsed = Number(options.ordinal);
		if (Number.isNaN(parsed) || parsed < 0) {
			console.error(`Invalid ordinal: ${options.ordinal}. Must be a non-negative number.`);
			process.exitCode = 1;
			return;
		}
		ordinalValue = parsed;
	}

	if (options.milestone !== undefined && options.clearMilestone) {
		console.error("Cannot use --milestone and --clear-milestone together.");
		process.exitCode = 1;
		return;
	}

	let milestoneValue: string | null | undefined;
	if (typeof options.milestone === "string") {
		milestoneValue = await resolveCliMilestoneInput(core, options.milestone);
	} else if (options.clearMilestone) {
		milestoneValue = null;
	}

	let removeCriteria: number[] | undefined;
	let checkCriteria: number[] | undefined;
	let uncheckCriteria: number[] | undefined;
	let removeDod: number[] | undefined;
	let checkDod: number[] | undefined;
	let uncheckDod: number[] | undefined;

	try {
		const removes = parsePositiveIndexList(options.removeAc);
		if (removes.length > 0) {
			removeCriteria = removes;
		}
		const checks = parsePositiveIndexList(options.checkAc);
		if (checks.length > 0) {
			checkCriteria = checks;
		}
		const unchecks = parsePositiveIndexList(options.uncheckAc);
		if (unchecks.length > 0) {
			uncheckCriteria = unchecks;
		}
		const dodRemoves = parsePositiveIndexList(options.removeDod);
		if (dodRemoves.length > 0) {
			removeDod = dodRemoves;
		}
		const dodChecks = parsePositiveIndexList(options.checkDod);
		if (dodChecks.length > 0) {
			checkDod = dodChecks;
		}
		const dodUnchecks = parsePositiveIndexList(options.uncheckDod);
		if (dodUnchecks.length > 0) {
			uncheckDod = dodUnchecks;
		}
	} catch (error) {
		console.error(AppError.formatCLIError(error));
		process.exitCode = 1;
		return;
	}

	const labelValues = parseDelimitedStringList(options.label) ?? [];
	const addLabelValues = parseDelimitedStringList(options.addLabel) ?? [];
	const removeLabelValues = parseDelimitedStringList(options.removeLabel) ?? [];
	const assigneeValues = parseDelimitedStringList(options.assignee) ?? [];
	const acceptanceAdditions = processAcceptanceCriteriaOptions(options);
	const definitionOfDoneAdditions = toStringArray(options.dod)
		.map((value) => String(value).trim())
		.filter((value) => value.length > 0);

	const combinedDependencies = [...toStringArray(options.dependsOn), ...toStringArray(options.dep)];
	const dependencyValues = combinedDependencies.length > 0 ? normalizeDependencies(combinedDependencies) : undefined;

	const normalizedReferences = parseDelimitedStringList(options.ref);
	const normalizedDocumentation = parseDelimitedStringList(options.doc);
	const normalizedModifiedFiles = parseDelimitedStringList(options.modifiedFile);

	const notesAppendValues = toStringArray(options.appendNotes);
	const finalSummaryAppendValues = toStringArray(options.appendFinalSummary);

	const editArgs: TaskEditArgs = {};
	if (options.title) {
		editArgs.title = String(options.title);
	}
	const descriptionOption = options.description ?? options.desc;
	if (descriptionOption !== undefined) {
		editArgs.description = String(descriptionOption);
	}
	if (canonicalStatus) {
		editArgs.status = canonicalStatus;
	}
	if (normalizedPriority) {
		editArgs.priority = normalizedPriority;
	}
	if (ordinalValue !== undefined) {
		editArgs.ordinal = ordinalValue;
	}
	if (milestoneValue !== undefined) {
		editArgs.milestone = milestoneValue;
	}
	if (labelValues.length > 0) {
		editArgs.labels = labelValues;
	}
	if (addLabelValues.length > 0) {
		editArgs.addLabels = addLabelValues;
	}
	if (removeLabelValues.length > 0) {
		editArgs.removeLabels = removeLabelValues;
	}
	if (options.clearLabels) {
		editArgs.clearLabels = true;
	}
	if (assigneeValues.length > 0) {
		editArgs.assignee = assigneeValues;
	}
	if (dependencyValues && dependencyValues.length > 0) {
		editArgs.dependencies = dependencyValues;
	}
	if (normalizedReferences && normalizedReferences.length > 0) {
		editArgs.references = normalizedReferences;
	}
	if (normalizedDocumentation && normalizedDocumentation.length > 0) {
		editArgs.documentation = normalizedDocumentation;
	}
	if (normalizedModifiedFiles && normalizedModifiedFiles.length > 0) {
		editArgs.modifiedFiles = normalizedModifiedFiles;
	}
	if (options.dueDate) {
		editArgs.dueDate = String(options.dueDate);
	}
	if (options.clearDueDate) {
		editArgs.dueDate = null;
	}
	if (options.deferDate) {
		editArgs.deferDate = String(options.deferDate);
	}
	if (options.clearDeferDate) {
		editArgs.deferDate = null;
	}
	if (typeof options.plan === "string") {
		editArgs.planSet = String(options.plan);
	}
	if (typeof options.notes === "string") {
		editArgs.notesSet = String(options.notes);
	}
	if (notesAppendValues.length > 0) {
		editArgs.notesAppend = notesAppendValues;
	}
	if (typeof options.finalSummary === "string") {
		editArgs.finalSummary = String(options.finalSummary);
	}
	if (finalSummaryAppendValues.length > 0) {
		editArgs.finalSummaryAppend = finalSummaryAppendValues;
	}
	if (options.clearFinalSummary) {
		editArgs.finalSummaryClear = true;
	}
	if (acceptanceAdditions.length > 0) {
		editArgs.acceptanceCriteriaAdd = acceptanceAdditions;
	}
	if (removeCriteria) {
		editArgs.acceptanceCriteriaRemove = removeCriteria;
	}
	if (checkCriteria) {
		editArgs.acceptanceCriteriaCheck = checkCriteria;
	}
	if (uncheckCriteria) {
		editArgs.acceptanceCriteriaUncheck = uncheckCriteria;
	}
	if (definitionOfDoneAdditions.length > 0) {
		editArgs.definitionOfDoneAdd = definitionOfDoneAdditions;
	}
	if (removeDod) {
		editArgs.definitionOfDoneRemove = removeDod;
	}
	if (checkDod) {
		editArgs.definitionOfDoneCheck = checkDod;
	}
	if (uncheckDod) {
		editArgs.definitionOfDoneUncheck = uncheckDod;
	}

	const beforeLabels = [...(existingTask.labels ?? [])];

	let updatedTask: Task;
	try {
		const updateInput = buildTaskUpdateInput(editArgs);
		updatedTask = await core.editTask(canonicalId, updateInput);
	} catch (error) {
		console.error(AppError.formatCLIError(error));
		process.exitCode = 1;
		return;
	}

	const afterLabels = updatedTask.labels ?? [];
	const added = afterLabels.filter((l) => !beforeLabels.includes(l));
	const removed = beforeLabels.filter((l) => !afterLabels.includes(l));

	const fmtLabel = (l: string) => {
		const color = core.config ? resolveLabelColor(l, core.config) : null;
		return color ? `${colorizeLabel(color, "●")}${l}` : l;
	};

	const hadLabelFlags =
		editArgs.labels !== undefined ||
		editArgs.addLabels !== undefined ||
		editArgs.removeLabels !== undefined ||
		editArgs.clearLabels;

	if (hadLabelFlags && added.length === 0 && removed.length === 0) {
		const details: string[] = [];
		if (editArgs.clearLabels && beforeLabels.length === 0) {
			details.push("no labels to clear");
		}
		if (editArgs.removeLabels) {
			const notFound = editArgs.removeLabels.filter(
				(l) => !beforeLabels.some((b) => b.toLowerCase() === l.toLowerCase()),
			);
			if (notFound.length > 0) {
				details.push(`label${notFound.length > 1 ? "s" : ""} ${notFound.join(", ")} not found`);
			}
		}
		if (editArgs.addLabels) {
			const already = editArgs.addLabels.filter((l) => beforeLabels.some((b) => b.toLowerCase() === l.toLowerCase()));
			if (already.length > 0) {
				details.push(`label${already.length > 1 ? "s" : ""} ${already.join(", ")} already present`);
			}
		}
		const msg = details.length > 0 ? `No changes: ${details.join("; ")}.` : "No changes.";
		if (getOutputMode() === "json") {
			stdout({ ...updatedTask, _labelChanges: { before: beforeLabels, after: afterLabels } });
			return;
		}
		stdout(picocolors.yellow(msg));
		return;
	}

	if (getOutputMode() === "json") {
		const output = {
			...updatedTask,
			_labelChanges: {
				before: beforeLabels,
				after: afterLabels,
				added: added.length > 0 ? added : undefined,
				removed: removed.length > 0 ? removed : undefined,
			},
		};
		stdout(output);
		return;
	}

	if (getOutputMode() === "plain") {
		stdout(updatedTask, (d) => formatTaskPlainText(d as Task));
		return;
	}

	if (hadLabelFlags) {
		if (editArgs.labels !== undefined) {
			const labelsStr = afterLabels.map(fmtLabel).join(" ") || picocolors.dim("(none)");
			stdout(`Updated task ${updatedTask.id}. ${picocolors.dim("Labels:")} ${labelsStr}`);
		} else if (added.length > 0 || removed.length > 0) {
			const parts = [`Updated task ${updatedTask.id}.`];
			if (removed.length > 0) {
				parts.push(`${picocolors.red("Removed:")} ${removed.map(fmtLabel).join(" ")}`);
			}
			if (added.length > 0) {
				parts.push(`${picocolors.green("Added:")} ${added.map(fmtLabel).join(" ")}`);
			}
			parts.push(`${picocolors.dim("Now:")} ${afterLabels.map(fmtLabel).join(" ") || picocolors.dim("(none)")}`);
			stdout(parts.join(" "));
		} else {
			stdout(`Updated task ${updatedTask.id}.`);
		}
		return;
	}

	stdout(`Updated task ${updatedTask.id}`);
}

async function handleTaskReorderCommand(taskId: string, options: Record<string, unknown>) {
	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	await core.ensureConfigLoaded();

	const canonicalId = normalizeTaskId(taskId);
	const task = await core.loadTaskById(canonicalId);
	if (!task) {
		console.error(`Task ${taskId} not found.`);
		process.exitCode = 1;
		return;
	}

	const explicitOrdinal = options.ordinal !== undefined ? Number(options.ordinal) : undefined;
	if (explicitOrdinal !== undefined) {
		if (!Number.isFinite(explicitOrdinal) || explicitOrdinal < 0) {
			console.error(`Invalid ordinal: ${options.ordinal}. Must be a non-negative number.`);
			process.exitCode = 1;
			return;
		}
		try {
			await core.editTask(canonicalId, { ordinal: explicitOrdinal });
			stdout(`Reordered task ${canonicalId} to ordinal ${explicitOrdinal}`);
		} catch (error) {
			console.error(AppError.formatCLIError(error));
			process.exitCode = 1;
		}
		return;
	}

	const afterId = options.after ? normalizeTaskId(String(options.after)) : undefined;
	const beforeId = options.before ? normalizeTaskId(String(options.before)) : undefined;

	if (!afterId && !beforeId) {
		console.error("Specify --after, --before, or --ordinal");
		process.exitCode = 1;
		return;
	}

	const refId = afterId || (beforeId as string);
	const refTask = await core.loadTaskById(refId);
	if (!refTask) {
		console.error(`Reference task ${refId} not found.`);
		process.exitCode = 1;
		return;
	}

	const targetStatus = options.status ? String(options.status).trim() : refTask.status || "To Do";

	const allTasks = await core.filesystem.listTasks();
	const statusTasks = allTasks
		.filter((t) => (t.status || "").toLowerCase() === targetStatus.toLowerCase())
		.sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));

	const orderedIds = statusTasks.map((t) => t.id);
	const currentIdx = orderedIds.indexOf(canonicalId);
	if (currentIdx !== -1) {
		orderedIds.splice(currentIdx, 1);
	}

	const refIdx = orderedIds.indexOf(refId);
	if (refIdx === -1) {
		console.error(`Reference task ${refId} not found in status "${targetStatus}".`);
		process.exitCode = 1;
		return;
	}

	const insertAt = afterId ? refIdx + 1 : refIdx;
	orderedIds.splice(insertAt, 0, canonicalId);

	try {
		await core.reorderTask({
			taskId: canonicalId,
			targetStatus,
			orderedTaskIds: orderedIds,
		});
		stdout(`Reordered task ${canonicalId} ${afterId ? "after" : "before"} ${refId}`);
	} catch (error) {
		console.error(AppError.formatCLIError(error));
		process.exitCode = 1;
	}
}

async function viewTaskSection(task: Task, section: string, core: Core, options: { json?: boolean }): Promise<void> {
	const normalized = section.toLowerCase().replaceAll(/[_-]/g, "");

	const resolveData = () => {
		switch (normalized) {
			case "labels":
				return task.labels ?? [];
			case "status":
				return { status: task.status, priority: task.priority ?? null };
			case "assignee":
			case "assignees":
				return task.assignee ?? [];
			case "milestone":
				return task.milestone ?? null;
			case "desc":
			case "description":
				return task.description ?? "";
			case "plan":
			case "implplan":
			case "implementationplan":
				return task.implementationPlan ?? "";
			case "notes":
			case "implnotes":
			case "implementationnotes":
				return task.implementationNotes ?? "";
			case "summary":
			case "finalsummary":
				return task.finalSummary ?? "";
			case "ac":
			case "acceptancecriteria":
				return task.acceptanceCriteriaItems ?? [];
			case "dod":
			case "definitionofdone":
				return task.definitionOfDoneItems ?? [];
			case "refs":
			case "references":
				return task.references ?? [];
			case "deps":
			case "dependencies":
				return task.dependencies ?? [];
			case "files":
			case "modifiedfiles":
				return task.modifiedFiles ?? [];
			default:
				return undefined;
		}
	};

	const data = resolveData();

	if (data === undefined) {
		console.error(
			"Unknown section: " +
				section +
				". Valid sections: labels, status, assignee, milestone, desc, plan, notes, summary, ac, dod, refs, deps, files",
		);
		process.exitCode = 1;
		return;
	}

	if (options.json) {
		stdout(data);
		return;
	}

	const empty = (msg: string) => stdout(picocolors.dim(msg));

	switch (normalized) {
		case "labels": {
			const labels = data as string[];
			if (labels.length === 0) {
				empty("No labels.");
				return;
			}
			for (const label of labels) {
				const color = core.config ? resolveLabelColor(label, core.config) : null;
				const indicator = color ? colorizeLabel(color, "\u25CF") : "";
				stdout(`  ${indicator}${indicator ? " " : ""}${label}`);
			}
			return;
		}
		case "status": {
			const d = data as { status: string; priority: string | null };
			stdout(`  Status:   ${d.status}`);
			if (d.priority) stdout(`  Priority: ${d.priority}`);
			return;
		}
		case "assignee":
		case "assignees": {
			const list = data as string[];
			if (list.length === 0) {
				empty("No assignees.");
				return;
			}
			for (const a of list) stdout(`  ${a.startsWith("@") ? a : `@${a}`}`);
			return;
		}
		case "milestone": {
			const ms = data as string | null;
			if (!ms) {
				empty("No milestone.");
				return;
			}
			stdout(`  ${ms}`);
			return;
		}
		case "desc":
		case "description": {
			const text = data as string;
			if (!text.trim()) {
				empty("No description.");
				return;
			}
			stdout(text);
			return;
		}
		case "plan":
		case "implplan":
		case "implementationplan":
		case "notes":
		case "implnotes":
		case "implementationnotes":
		case "summary":
		case "finalsummary": {
			const text = data as string;
			if (!text.trim()) {
				empty(
					"No " +
						(normalized === "summary" || normalized === "finalsummary" ? "final summary" : "implementation notes") +
						".",
				);
				return;
			}
			stdout(text);
			return;
		}
		case "ac":
		case "acceptancecriteria":
			renderChecklist(data as Task["acceptanceCriteriaItems"], "No acceptance criteria.");
			return;
		case "dod":
		case "definitionofdone":
			renderChecklist(data as Task["definitionOfDoneItems"], "No Definition of Done items.");
			return;
		case "refs":
		case "references": {
			const list = data as string[];
			if (list.length === 0) {
				empty("No references.");
				return;
			}
			for (const ref of list) stdout(`  ${ref}`);
			return;
		}
		case "deps":
		case "dependencies": {
			const list = data as string[];
			if (list.length === 0) {
				empty("No dependencies.");
				return;
			}
			for (const dep of list) stdout(`  ${dep}`);
			return;
		}
		case "files":
		case "modifiedfiles": {
			const list = data as string[];
			if (list.length === 0) {
				empty("No modified files.");
				return;
			}
			for (const f of list) stdout(`  ${f}`);
			return;
		}
	}
}

export function registerTaskCommand(program: Command): void {
	const taskCmd = program.command("task").aliases(["tasks"]);

	taskCmd
		.command("create [title]")
		.option("-d, --description <text>", "task description (multi-line: include real newlines inside the quoted string)")
		.option("--desc <text>", "alias for --description")
		.option("-a, --assignee <assignee>")
		.option("-s, --status <status>")
		.option(
			"-l, --labels <labels>",
			"set labels (comma-separated or use multiple times)",
			createMultiValueAccumulator(),
		)
		.option("--priority <priority>", "set task priority (high, medium, low)")
		.option("--plain", "use plain text output after creating")
		.option(
			"--ac <criteria>",
			"add acceptance criteria (can be used multiple times); use single quotes to prevent shell expansion of backticks",
			createMultiValueAccumulator(),
		)
		.option(
			"--acceptance-criteria <criteria>",
			"add acceptance criteria (can be used multiple times); use single quotes to prevent shell expansion of backticks",
			createMultiValueAccumulator(),
		)
		.option("--dod <item>", "add Definition of Done item (can be used multiple times)", createMultiValueAccumulator())
		.option("--no-dod-defaults", "disable Definition of Done defaults")
		.option("--plan <text>", "add implementation plan")
		.option("--notes <text>", "add implementation notes")
		.option("--final-summary <text>", "add final summary")
		.option("--ordinal <number>", "set task ordinal for custom ordering")
		.option("--due-date <date>", "due date for the task (YYYY-MM-DD or YYYY-MM-DD HH:mm)")
		.option("--defer-date <date>", "defer/show after date (YYYY-MM-DD or YYYY-MM-DD HH:mm)")
		.option("-m, --milestone <milestone>", "assign task to milestone by ID or title")
		.option("--draft")
		.option("-p, --parent <taskId>", "specify parent task ID")
		.option(
			"--depends-on <taskIds>",
			"specify task dependencies (comma-separated or use multiple times)",
			createMultiValueAccumulator(),
		)
		.option("--dep <taskIds>", "specify task dependencies (shortcut for --depends-on)", createMultiValueAccumulator())
		.option(
			"--ref <reference>",
			"add reference URL or file path (can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--modified-file <path>",
			"add modified file path from project root (can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--doc <documentation>",
			"add documentation URL or file path (can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option("--json", "output as JSON")
		.action(async (title: string | undefined, options) => {
			await handleTaskCreateCommand(title, options);
		});

	taskCmd
		.command("list")
		.description("list tasks grouped by status")
		.option("-s, --status <status>", "filter tasks by status (case-insensitive)")
		.option("-a, --assignee <assignee>", "filter tasks by assignee")
		.option("-m, --milestone <milestone>", "filter tasks by milestone (closest match, case-insensitive)")
		.option("-p, --parent <taskId>", "filter tasks by parent task ID")
		.option("--priority <priority>", "filter tasks by priority (high, medium, low)")
		.option("--sort <field>", "sort tasks by field (priority, id, ordinal, created, due)")
		.option("--overdue", "filter tasks that are past their due date")
		.option("--due-soon <days>", "filter tasks due within the next N days")
		.option("--deferred", "filter tasks whose defer date is in the future")
		.option("--plain", "use plain text output instead of interactive UI")
		.option("--json", "output as JSON")
		.action(async (options) => {
			await handleTaskListCommand(options);
		});

	taskCmd
		.command("edit [taskId]")
		.description("edit an existing task")
		.option("-t, --title <title>")
		.option("-d, --description <text>", "task description (multi-line: include real newlines inside the quoted string)")
		.option("--desc <text>", "alias for --description")
		.option("-a, --assignee <assignee>")
		.option("-s, --status <status>")
		.option("-l, --label <labels>", "set labels (comma-separated or use multiple times)", createMultiValueAccumulator())
		.option("--priority <priority>", "set task priority (high, medium, low)")
		.option("--ordinal <number>", "set task ordinal for custom ordering")
		.option("--due-date <date>", "set due date (YYYY-MM-DD or YYYY-MM-DD HH:mm)")
		.option("--defer-date <date>", "set defer/show after date (YYYY-MM-DD or YYYY-MM-DD HH:mm)")
		.option("--clear-due-date", "clear due date")
		.option("--clear-defer-date", "clear defer date")
		.option("-m, --milestone <milestone>", "assign task to milestone by ID or title")
		.option("--clear-milestone", "clear task milestone assignment")
		.option("--plain", "use plain text output after editing")
		.option("--add-label <label>", "add a label (can be used multiple times)", createMultiValueAccumulator())
		.option("--remove-label <label>", "remove a label (can be used multiple times)", createMultiValueAccumulator())
		.option("--clear-labels", "clear all labels before applying add/remove")
		.option(
			"--ac <criteria>",
			"add acceptance criteria (can be used multiple times); use single quotes to prevent shell expansion of backticks",
			createMultiValueAccumulator(),
		)
		.option("--dod <item>", "add Definition of Done item (can be used multiple times)", createMultiValueAccumulator())
		.option(
			"--remove-ac <index>",
			"remove acceptance criterion by index (1-based, can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--remove-dod <index>",
			"remove Definition of Done item by index (1-based, can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--check-ac <index>",
			"check acceptance criterion by index (1-based, can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--check-dod <index>",
			"check Definition of Done item by index (1-based, can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--uncheck-ac <index>",
			"uncheck acceptance criterion by index (1-based, can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--uncheck-dod <index>",
			"uncheck Definition of Done item by index (1-based, can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--acceptance-criteria <criteria>",
			"set acceptance criteria (comma-separated or use multiple times); use single quotes to prevent shell expansion of backticks",
		)
		.option("--plan <text>", "set implementation plan")
		.option("--notes <text>", "set implementation notes (replaces existing)")
		.option("--final-summary <text>", "set final summary (replaces existing)")
		.option(
			"--append-notes <text>",
			"append to implementation notes (can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option(
			"--append-final-summary <text>",
			"append to final summary (can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option("--clear-final-summary", "remove final summary")
		.option(
			"--depends-on <taskIds>",
			"set task dependencies (comma-separated or use multiple times)",
			createMultiValueAccumulator(),
		)
		.option("--dep <taskIds>", "set task dependencies (shortcut for --depends-on)", createMultiValueAccumulator())
		.option("--ref <reference>", "set references (can be used multiple times)", createMultiValueAccumulator())
		.option(
			"--modified-file <path>",
			"set modified file paths from project root (can be used multiple times)",
			createMultiValueAccumulator(),
		)
		.option("--doc <documentation>", "set documentation (can be used multiple times)", createMultiValueAccumulator())
		.option("--json", "output as JSON")
		.action(async (taskId: string | undefined, options) => {
			await handleTaskEditCommand(taskId, options);
		});

	taskCmd
		.command("view <taskId> [section]")
		.description(
			"display task details or a specific section (labels, status, assignee, milestone, desc, plan, notes, summary, ac, dod, refs, deps, files)",
		)
		.option("--plain", "use plain text output instead of interactive UI (ignored when section is specified)")
		.option("--json", "output as JSON")
		.action(async (taskId: string, section: string | undefined, options) => {
			applyOutputOptions(options);
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();
			const localTasks = await core.filesystem.listTasks();
			const task = await core.getTaskWithSubtasks(taskId, localTasks);
			if (!task) {
				console.error(`Task ${taskId} not found.`);
				return;
			}

			if (section) {
				await viewTaskSection(task, section, core, options);
				return;
			}

			const allTasks = localTasks.some((candidate) => taskIdsEqual(task.id, candidate.id))
				? localTasks
				: [...localTasks, task];

			const usePlainOutput = getOutputMode() === "plain" || (getOutputMode() === "auto" && shouldAutoPlain());
			if (usePlainOutput) {
				stdout(task, (d) => formatTaskPlainText(d as Task));
				return;
			}

			if (getOutputMode() === "json") {
				stdout(task);
				return;
			}

			await viewTaskEnhanced(task, { startWithDetailFocus: true, core, tasks: allTasks });
		});

	taskCmd
		.command("labels <taskId>")
		.description("display task labels with colors (alias for `task view <taskId> labels`)")
		.option("--json", "output as JSON")
		.action(async (taskId: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();
			const task = await core.loadTaskById(normalizeTaskId(taskId));
			if (!task) {
				console.error(`Task ${taskId} not found.`);
				return;
			}
			await viewTaskSection(task, "labels", core, options);
		});

	taskCmd
		.command("archive <taskId>")
		.description("archive a task")
		.action(async (taskId: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();
			const task = await core.filesystem.loadTask(taskId);
			if (!task) {
				console.error(`Task ${taskId} not found.`);
				return;
			}
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses ?? [];
			const terminalStatuses = config?.terminalStatuses;
			if (isTerminalStatus(task.status, statuses, terminalStatuses)) {
				const terminalStatus = getTerminalStatus(statuses, terminalStatuses) ?? "Done";
				console.error(
					`Task ${taskId} is ${terminalStatus}. Set status via task_edit before archiving, or use the board UI.`,
				);
				process.exitCode = 1;
				return;
			}
			const success = await core.archiveTask(taskId);
			if (success) {
				stdout(`Archived task ${taskId}`);
			} else {
				console.error(`Task ${taskId} not found.`);
			}
		});

	taskCmd
		.command("demote <taskId>")
		.description("move task back to drafts")
		.action(async (taskId: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			try {
				const success = await core.demoteTask(taskId);
				if (success) {
					stdout(`Demoted task ${taskId}`);
				} else {
					console.error(`Task ${taskId} not found.`);
				}
			} catch (error) {
				console.error(AppError.formatCLIError(error));
				process.exitCode = 1;
			}
		});

	taskCmd
		.command("reorder <taskId>")
		.description("reorder a task by setting ordinal or placing after/before another task")
		.option("--after <taskId>", "place after this task")
		.option("--before <taskId>", "place before this task")
		.option("--ordinal <number>", "set task ordinal for custom ordering")
		.action(async (taskId: string, options) => {
			await handleTaskReorderCommand(taskId, options);
		});

	taskCmd
		.argument("[taskId]")
		.option("--plain", "use plain text output")
		.action(async (taskId: string | undefined, options: { plain?: boolean }) => {
			applyOutputOptions(options);
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);

			const reservedCommands = ["create", "list", "edit", "view", "archive", "demote", "reorder"];
			if (taskId && reservedCommands.includes(taskId)) {
				console.error(`Unknown command: ${taskId}`);
				taskCmd.help();
				return;
			}

			if (!taskId) {
				taskCmd.help();
				return;
			}

			const localTasks = await core.filesystem.listTasks();
			const task = await core.getTaskWithSubtasks(taskId, localTasks);
			if (!task) {
				console.error(`Task ${taskId} not found.`);
				return;
			}

			const allTasks = localTasks.some((candidate) => taskIdsEqual(task.id, candidate.id))
				? localTasks
				: [...localTasks, task];

			const usePlainOutput = getOutputMode() === "plain" || (getOutputMode() === "auto" && shouldAutoPlain());
			if (usePlainOutput) {
				stdout(task, (d) => formatTaskPlainText(d as Task));
				return;
			}

			const { runUnifiedView } = await import("../ui/unified-view.ts");
			await runUnifiedView({
				core,
				initialView: "task-detail",
				selectedTask: task,
				tasks: allTasks,
			});
		});
}
