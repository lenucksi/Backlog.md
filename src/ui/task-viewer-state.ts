/* Viewer state interface + pure helper functions for task-viewer panes */

import type { BoxInterface, LineInterface, ScrollableTextInterface } from "neo-neo-bblessed";
import type { Task } from "../types/index.ts";
import type { GenericList } from "./components/generic-list.ts";

export type PendingSearchWrap = "to-first" | "to-last" | null;
export type PaneFocus = "list" | "detail";
export type TaskListBoundaryDirection = "up" | "down";

export interface ViewerState {
	allTasks: Task[];
	filteredTasks: Task[];
	currentSelectedTask: Task;
	currentFocus: "filters" | "list" | "detail";
	filterPopupOpen: boolean;
	modalOpen: boolean;
	pendingSearchWrap: PendingSearchWrap;
	filterExitPane: PaneFocus;
	searchQuery: string;
	statusFilter: string;
	priorityFilter: string;
	labelFilter: string[];
	milestoneFilter: string;
	noResultsMessage: string | null;
	selectedTaskIds: Set<string>;
	filtersActive: boolean;
	requireInitialFilterSelection: boolean;
	taskSearchIndex: ReturnType<typeof import("../utils/task-search.ts").createTaskSearchIndex> | null;
	taskList: GenericList<Task> | null;
	listEmptyStateBox: BoxInterface | null;
	descriptionBox: ScrollableTextInterface | undefined;
	headerDetailBox: BoxInterface | undefined;
	divider: LineInterface | undefined;
}

function createInitialViewerState(): Partial<ViewerState> {
	return {
		currentFocus: "list",
		filterPopupOpen: false,
		modalOpen: false,
		pendingSearchWrap: null,
		filterExitPane: "list",
		searchQuery: "",
		statusFilter: "",
		priorityFilter: "",
		labelFilter: [],
		milestoneFilter: "",
		noResultsMessage: null,
		selectedTaskIds: new Set<string>(),
		taskSearchIndex: null,
		taskList: null,
		listEmptyStateBox: null,
	};
}

export function shouldMoveFromListBoundaryToSearch(
	direction: TaskListBoundaryDirection,
	selectedIndex: number,
	totalTasks: number,
): boolean {
	if (totalTasks <= 0) {
		return false;
	}
	if (direction === "up") {
		return selectedIndex <= 0;
	}
	return selectedIndex >= totalTasks - 1;
}

export function shouldMoveFromDetailBoundaryToSearch(
	direction: TaskListBoundaryDirection,
	scrollOffset: number,
): boolean {
	if (direction !== "up") {
		return false;
	}
	return scrollOffset <= 0;
}

export function resolveSearchExitTargetIndex(
	direction: "up" | "down" | "escape",
	pendingWrap: PendingSearchWrap,
	totalTasks: number,
	currentIndex: number | undefined,
): number | undefined {
	if (totalTasks <= 0) {
		return undefined;
	}
	if (direction === "up" && pendingWrap === "to-last") {
		return totalTasks - 1;
	}
	if (direction === "down" && pendingWrap === "to-first") {
		return 0;
	}
	return currentIndex;
}

export function resolveFilterExitPane(
	preferredPane: PaneFocus,
	hasTaskList: boolean,
	hasDetailPane: boolean,
): PaneFocus | null {
	if (preferredPane === "detail" && hasDetailPane) {
		return "detail";
	}
	if (hasTaskList) {
		return "list";
	}
	if (hasDetailPane) {
		return "detail";
	}
	return null;
}

export function resolveTaskListSelection<T>(
	items: readonly T[],
	selectedIndex: number | number[] | undefined,
	fallback: T | null = null,
): T | null {
	const index = Array.isArray(selectedIndex) ? selectedIndex[0] : selectedIndex;
	if (typeof index !== "number") {
		return fallback;
	}
	return items[index] ?? fallback;
}
