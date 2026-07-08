/* Task viewer operation helpers extracted from the main orchestrator */

import { box, type ScreenInterface, textbox } from "neo-neo-bblessed";
import type { Core } from "../core/backlog.ts";
import { NO_MILESTONE_FILTER_LABEL, NO_MILESTONE_FILTER_VALUE } from "../utils/milestone-filter.ts";
import { createTaskSearchIndex } from "../utils/task-search.ts";
import { openConfirmPopup } from "./components/confirm-popup.ts";
import type { FilterControlId, FilterHeader } from "./components/filter-header.ts";
import { openMultiSelectFilterPopup, openSingleSelectFilterPopup } from "./components/filter-popup.ts";
import type { Task } from "../types/index.ts";

export async function openFilterPicker(
	filterId: Exclude<FilterControlId, "search">,
	screen: ScreenInterface,
	filterHeader: FilterHeader,
	availableLabels: string[],
	statuses: string[],
	availableMilestoneTitles: string[],
	state: {
		statusFilter: string;
		priorityFilter: string;
		labelFilter: string[];
		milestoneFilter: string;
	},
	applyFilters: () => void,
	notifyFilterChange: () => void,
	onClose: () => void,
): Promise<void> {
	if (filterId === "labels") {
		const nextLabels = await openMultiSelectFilterPopup({
			screen,
			title: "Label Filter",
			items: [...availableLabels].sort((a, b) => a.localeCompare(b)),
			selectedItems: state.labelFilter,
		});
		if (nextLabels !== null) {
			state.labelFilter = nextLabels;
			filterHeader.setFilters({ labels: nextLabels });
			applyFilters();
			notifyFilterChange();
		}
		onClose();
		return;
	}
	if (filterId === "status") {
		const selected = await openSingleSelectFilterPopup({
			screen,
			title: "Status Filter",
			selectedValue: state.statusFilter,
			choices: [{ label: "All", value: "" }, ...statuses.map((s) => ({ label: s, value: s }))],
		});
		if (selected !== null) {
			state.statusFilter = selected;
			filterHeader.setFilters({ status: selected });
			applyFilters();
			notifyFilterChange();
		}
		onClose();
		return;
	}
	if (filterId === "priority") {
		const priorities = ["high", "medium", "low"];
		const selected = await openSingleSelectFilterPopup({
			screen,
			title: "Priority Filter",
			selectedValue: state.priorityFilter,
			choices: [{ label: "All", value: "" }, ...priorities.map((p) => ({ label: p, value: p }))],
		});
		if (selected !== null) {
			state.priorityFilter = selected;
			filterHeader.setFilters({ priority: selected });
			applyFilters();
			notifyFilterChange();
		}
		onClose();
		return;
	}
	const selected = await openSingleSelectFilterPopup({
		screen,
		title: "Milestone Filter",
		selectedValue: state.milestoneFilter,
		choices: [
			{ label: "All", value: "" },
			{ label: NO_MILESTONE_FILTER_LABEL, value: NO_MILESTONE_FILTER_VALUE },
			...availableMilestoneTitles.map((m) => ({ label: m, value: m })),
		],
	});
	if (selected !== null) {
		state.milestoneFilter = selected;
		filterHeader.setFilters({ milestone: selected });
		applyFilters();
		notifyFilterChange();
	}
	onClose();
}

export async function executeBulkAction(
	_action: "archive",
	core: Core,
	screen: ScreenInterface,
	ids: string[],
	runWithModalGuard: <T>(op: () => Promise<T>) => Promise<T>,
	showTransientHelp: (msg: string) => void,
	onSuccess: () => void,
): Promise<void> {
	if (ids.length === 0) return;
	const confirmed = await runWithModalGuard(() =>
		openConfirmPopup({
			screen,
			title: "Bulk Archive",
			message: `Archive {bold}${ids.length}{/} selected task(s)?`,
		}),
	);
	if (!confirmed) return;
	const result = await core.bulkArchive(ids);
	if (result.succeeded.length > 0) {
		onSuccess();
		showTransientHelp(` {green-fg}Archived ${result.succeeded.length} task(s){/}`);
	}
	if (result.failed.length > 0) {
		showTransientHelp(
			` {red-fg}${result.failed.length} task(s) failed: ${result.failed.map((f) => f.id).join(", ")}{/}`,
		);
	}
}

export async function executeBulkUpdate(
	field: string,
	core: Core,
	screen: ScreenInterface,
	ids: string[],
	runWithModalGuard: <T>(op: () => Promise<T>) => Promise<T>,
	showTransientHelp: (msg: string) => void,
	onSuccess: () => void,
): Promise<void> {
	if (ids.length === 0) return;
	const { genericSelectList, genericMultiSelect } = await import("./components/generic-list.ts");
	const fields: Record<string, unknown> = {};

	if (field === "status") {
		const config = await core.filesystem.loadConfig();
		const statuses = config?.statuses ?? ["To Do", "In Progress", "Done"];
		const chosen = await runWithModalGuard(() =>
			genericSelectList(
				"Set Status",
				statuses.map((s: string) => ({ id: s })),
			),
		);
		if (!chosen) return;
		fields.status = chosen.id;
	} else if (field === "priority") {
		const chosen = await runWithModalGuard(() =>
			genericSelectList(
				"Set Priority",
				["high", "medium", "low"].map((p) => ({ id: p })),
			),
		);
		if (!chosen) return;
		fields.priority = chosen.id as "high" | "medium" | "low";
	} else if (field === "milestone") {
		const milestones = await core.filesystem.listMilestones();
		const options = [{ id: "(clear)" }, ...milestones.map((m: { id: string }) => ({ id: m.id }))];
		const chosen = await runWithModalGuard(() => genericSelectList("Set Milestone", options));
		if (!chosen) return;
		fields.milestone = chosen.id === "(clear)" ? null : chosen.id;
	} else if (field === "dueDate") {
		const dateStr = await runWithModalGuard(
			() =>
				new Promise<string | null>((resolve) => {
					const popupBox = box({
						parent: screen,
						top: "center",
						left: "center",
						width: 40,
						height: 5,
						border: { type: "line" },
						style: { border: { fg: "cyan" }, bg: "black" },
						tags: true,
						content: "{bold}Due Date{/} (YYYY-MM-DD, empty to clear)",
					});
					const input = textbox({
						parent: popupBox,
						top: 2,
						left: 2,
						right: 2,
						height: 1,
						inputOnFocus: true,
						style: { bg: "blue", fg: "white" },
					});
					input.focus();
					input.key(["escape"], () => {
						popupBox.destroy();
						screen.render();
						resolve(null);
					});
					input.key(["enter"], () => {
						const val = input.getValue();
						popupBox.destroy();
						screen.render();
						resolve(val || null);
					});
					screen.render();
				}),
		);
		if (dateStr === undefined) return;
		fields.dueDate = dateStr === "" ? null : dateStr;
	} else if (field === "labels") {
		const config = await core.filesystem.loadConfig();
		const labelNames = (config?.labels ?? []).map((l: string | { name: string; color?: string }) =>
			typeof l === "string" ? l : l.name,
		);
		const chosen = await runWithModalGuard(() =>
			genericMultiSelect(
				"Set Labels",
				labelNames.map((l: string) => ({ id: l })),
			),
		);
		if (!chosen) return;
		fields.labels = chosen.map((l: { id: string }) => l.id);
	} else if (field === "assignee") {
		const config = await core.filesystem.loadConfig();
		const authorNames = (config?.authors ?? []).map((a: string | { name: string; color?: string }) =>
			typeof a === "string" ? a : a.name,
		);
		const options = [{ id: "(clear)" }, ...authorNames.map((name: string) => ({ id: name }))];
		const chosen = await runWithModalGuard(() => genericSelectList("Set Assignee", options));
		if (!chosen) return;
		fields.assignee = chosen.id === "(clear)" ? [] : [chosen.id];
	}
	if (Object.keys(fields).length === 0) return;
	const result = await core.bulkUpdateTasks(ids, fields);
	if (result.succeeded.length > 0) {
		onSuccess();
	}
	if (result.failed.length > 0) {
		showTransientHelp(
			` {red-fg}${result.failed.length} task(s) failed: ${result.failed.map((f) => f.id).join(", ")}{/}`,
		);
	} else if (result.succeeded.length > 0) {
		const label = field.charAt(0).toUpperCase() + field.slice(1);
		showTransientHelp(` {green-fg}${label} updated for ${result.succeeded.length} task(s){/}`);
	}
}

export async function applyTaskLifecycleShortcut(
	_key: string,
	core: Core,
	screen: ScreenInterface,
	getCurrentShortcutTask: () => import("../types/index.ts").Task | null,
	showTransientHelp: (msg: string) => void,
	runWithModalGuard: <T>(op: () => Promise<T>) => Promise<T>,
	removeTaskFromCurrentView: (taskId: string) => void,
): Promise<void> {
	const task = getCurrentShortcutTask();
	if (!task) return;
	if (task.branch) {
		showTransientHelp(` {red-fg}Cannot archive task from branch "${task.branch}".{/}`);
		return;
	}
	try {
		const config = await core.filesystem.loadConfig();
		const confirmed = await runWithModalGuard(() =>
			openConfirmPopup({
				screen,
				title: "Archive Task",
				message: `Archive task {bold}${task.id}{/bold}?\n{gray-fg}${task.title}{/}`,
			}),
		);
		if (!confirmed) return;
		const success = await core.archiveTask(task.id, config?.autoCommit ?? false);
		if (success) {
			removeTaskFromCurrentView(task.id);
			showTransientHelp(` {green-fg}Archived ${task.id}{/}`);
		} else {
			showTransientHelp(` {red-fg}Failed to archive ${task.id}{/}`);
		}
	} catch (error) {
		showTransientHelp(` {red-fg}Error archiving task: ${error instanceof Error ? error.message : "Unknown error"}{/}`);
	}
}

export function buildEmptyFilterMessage(
	searchQuery: string, statusFilter: string, priorityFilter: string,
	labelFilter: string[], milestoneFilter: string,
): { noResultsMessage: string; listPaneMessage: string } {
	const activeFilters: string[] = [];
	const trimmedQuery = searchQuery.trim();
	if (trimmedQuery) activeFilters.push(`Search: {cyan-fg}${trimmedQuery}{/}`);
	if (statusFilter) activeFilters.push(`Status: {cyan-fg}${statusFilter}{/}`);
	if (priorityFilter) activeFilters.push(`Priority: {cyan-fg}${priorityFilter}{/}`);
	if (labelFilter.length > 0) activeFilters.push(`Labels: {yellow-fg}${labelFilter.join(", ")}{/}`);
	if (milestoneFilter) {
		const lbl = milestoneFilter === NO_MILESTONE_FILTER_VALUE ? NO_MILESTONE_FILTER_LABEL : milestoneFilter;
		activeFilters.push(`Milestone: {magenta-fg}${lbl}{/}`);
	}
	if (activeFilters.length > 0) {
		return {
			noResultsMessage: `{bold}No tasks match your current filters{/bold}\n${activeFilters.map((f) => ` • ${f}`).join("\n")}\n\n{gray-fg}Try adjusting the search or clearing filters.{/}`,
			listPaneMessage: `{bold}No matching tasks{/bold}\n\n${activeFilters.map((f) => ` • ${f}`).join("\n")}`,
		};
	}
	return {
		noResultsMessage: "{bold}No tasks available{/bold}\n{gray-fg}Create a task with {cyan-fg}backlog task create{/cyan-fg}.{/}",
		listPaneMessage: "{bold}No tasks available{/bold}",
	};
}

export async function openCurrentTaskInEditor(
	screen: ScreenInterface, core: Core,
	filterPopupOpen: boolean, currentFocus: string, noResultsMessage: string | null,
	currentSelectedTask: Task,
	showTransientHelp: (msg: string) => void,
	enrichTask: (t: Task | null) => Task | null,
	allTasks: Task[],
	taskSearchIndex: ReturnType<typeof import("../utils/task-search.ts").createTaskSearchIndex> | null,
	applyFilters: () => void,
	onTaskChange?: ((t: Task) => void) | null,
): Promise<{
	allTasks: Task[];
	taskSearchIndex: ReturnType<typeof import("../utils/task-search.ts").createTaskSearchIndex> | null;
	currentSelectedTask: Task;
}> {
	if (filterPopupOpen || currentFocus === "filters" || noResultsMessage) return { allTasks, taskSearchIndex, currentSelectedTask };
	try {
		const result = await core.editTaskInTui(currentSelectedTask.id, screen, currentSelectedTask);
		if (result.reason === "read_only") {
			showTransientHelp(` {red-fg}Task is read-only${result.task?.branch ? ` in branch ${result.task.branch}` : ""}.{/}`);
			return { allTasks, taskSearchIndex, currentSelectedTask };
		}
		if (result.reason === "editor_failed") {
			showTransientHelp(" {red-fg}Editor exited with an error; task was not modified.{/}");
			return { allTasks, taskSearchIndex, currentSelectedTask };
		}
		if (result.reason === "not_found") {
			showTransientHelp(` {red-fg}Task ${currentSelectedTask.id} was not found on this branch.{/}`);
			return { allTasks, taskSearchIndex, currentSelectedTask };
		}
		if (result.task) {
			const idx = allTasks.findIndex((t: Task) => t.id === currentSelectedTask.id);
			if (idx >= 0) allTasks[idx] = result.task;
			const enhanced = enrichTask(result.task) ?? result.task;
			onTaskChange?.(enhanced);
			const newTSI = taskSearchIndex ? createTaskSearchIndex(allTasks) : null;
			applyFilters();
			if (result.changed) {
				showTransientHelp(` {green-fg}Task ${result.task?.id ?? currentSelectedTask.id} marked modified.{/}`);
			} else {
				showTransientHelp(` {gray-fg}No changes detected for ${result.task?.id ?? currentSelectedTask.id}.{/}`);
			}
			return { allTasks, taskSearchIndex: newTSI, currentSelectedTask: enhanced };
		}
		applyFilters();
		return { allTasks, taskSearchIndex, currentSelectedTask };
	} catch (_error) {
		showTransientHelp(" {red-fg}Failed to open editor.{/}");
		return { allTasks, taskSearchIndex, currentSelectedTask };
	}
}

export function removeTaskFromCurrentView(
	taskId: string, currentAllTasks: Task[], _currentFilteredTasks: Task[],
	tsi: ReturnType<typeof createTaskSearchIndex> | null,
	currentSelectedTask: Task,
	enrichTask: (t: Task | null) => Task | null,
	onTaskChange?: ((t: Task) => void) | null,
): {
	allTasks: Task[];
	filteredTasks: Task[];
	taskSearchIndex: ReturnType<typeof createTaskSearchIndex> | null;
	currentSelectedTask: Task;
	nextTask: Task | null;
} {
	const remaining = currentAllTasks.filter((t: Task) => t.id !== taskId);
	const newAllTasks = remaining;
	const newTaskSearchIndex = tsi ? createTaskSearchIndex(newAllTasks) : null;
	let newSelectedTask = currentSelectedTask;
	const nextIndexCandidate = currentAllTasks.findIndex((t: Task) => t.id === taskId);
	const nextIndex = Math.min(Math.max(nextIndexCandidate, 0), remaining.length - 1);
	const nextTask = remaining[nextIndex] ?? null;
	if (nextTask) {
		newSelectedTask = enrichTask(nextTask) ?? nextTask;
		onTaskChange?.(newSelectedTask);
	}
	return { allTasks: newAllTasks, filteredTasks: remaining, taskSearchIndex: newTaskSearchIndex, currentSelectedTask: newSelectedTask, nextTask };
}
