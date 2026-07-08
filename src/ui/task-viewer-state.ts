/* Viewer state interface for task-viewer panes */

import type { BoxInterface, LineInterface, ScrollableTextInterface } from "neo-neo-bblessed";
import type { Task } from "../types/index.ts";
import type { GenericList } from "./components/generic-list.ts";

export type PendingSearchWrap = "to-first" | "to-last" | null;
export type PaneFocus = "list" | "detail";

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

export function createInitialViewerState(): Partial<ViewerState> {
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
