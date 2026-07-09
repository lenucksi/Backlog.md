/* Task viewer with search/filter header UI */
import { stdout as output } from "node:process";
import type { BoxInterface, ScreenInterface, ScrollableTextInterface } from "neo-neo-bblessed";
import { box } from "neo-neo-bblessed";
import { Core } from "../core/backlog.ts";
import { formatTaskPlainText } from "../formatters/task-plain-text.ts";
import type { LabelConfig, Milestone, Task, TaskSearchResult } from "../types/index.ts";
import { copyToClipboard } from "../utils/clipboard.ts";
import { collectAvailableLabels } from "../utils/label-filter.ts";
import { NO_MILESTONE_FILTER_VALUE } from "../utils/milestone-filter.ts";
import { hasAnyPrefix } from "../utils/prefix-config.ts";
import { applyTaskFilters, createTaskSearchIndex } from "../utils/task-search.ts";
import { attachSubtaskSummaries } from "../utils/task-subtasks.ts";
import type { FilterControlId, FilterHeader, FilterState } from "./components/filter-header.ts";
import { createFilterHeader } from "./components/filter-header.ts";
import type { GenericList } from "./components/generic-list.ts";
import { openHelpPopup } from "./components/help-popup.ts";
import { formatFooterContent } from "./footer-content.ts";
import { createLoadingScreen } from "./loading.ts";
import { type StatusStyleOptions, statusOptionsFromConfig } from "./status-icon.ts";
import { createMilestoneLabelResolver } from "./task-detail-content.ts";
import {
	type DetailPaneCallbacks,
	type DetailPaneWidgets,
	destroyDetailWidgets,
	renderDetailPane,
} from "./task-detail-pane.ts";
import {
	createEmptyStateBox,
	destroyEmptyStateBox,
	renderTaskList,
	type TaskListPaneCallbacks,
} from "./task-list-pane.ts";
import { createTaskPopup as createTaskPopupImpl } from "./task-popup.ts";
import { type KeybindingCallbacks, registerViewerKeybindings } from "./task-viewer-keybindings.ts";
import { LAYOUT } from "./task-viewer-layout.ts";
import {
	applyTaskLifecycleShortcut as applyTaskLifecycleShortcutImpl,
	buildEmptyFilterMessage,
	executeBulkAction as executeBulkActionImpl,
	executeBulkUpdate as executeBulkUpdateImpl,
	openCurrentTaskInEditor as openCurrentTaskInEditorImpl,
	openFilterPicker as openFilterPickerImpl,
	removeTaskFromCurrentView as removeTaskFromCurrentViewImpl,
} from "./task-viewer-operations.ts";
import {
	type PaneFocus,
	type PendingSearchWrap,
	resolveFilterExitPane,
	resolveSearchExitTargetIndex,
	resolveTaskListSelection,
} from "./task-viewer-state.ts";
import { createScreen } from "./tui.ts";
export function buildTaskViewerMilestoneFilterModel(activeMilestones: Milestone[]): {
	availableMilestoneTitles: string[];
	resolveMilestoneLabel: (milestone: string) => string;
} {
	return {
		availableMilestoneTitles: activeMilestones.map((milestone) => milestone.title),
		resolveMilestoneLabel: createMilestoneLabelResolver(activeMilestones),
	};
}
export async function viewTaskEnhanced(
	task: Task,
	options: {
		tasks?: Task[];
		core?: Core;
		title?: string;
		filterDescription?: string;
		searchQuery?: string;
		statusFilter?: string;
		priorityFilter?: string;
		milestoneFilter?: string;
		labelFilter?: string[];
		startWithDetailFocus?: boolean;
		startWithSearchFocus?: boolean;
		viewSwitcher?: import("./view-switcher.ts").ViewSwitcher;
		onTaskChange?: (task: Task) => void;
		onTabPress?: () => Promise<void>;
		onFilterChange?: (filters: {
			searchQuery: string;
			statusFilter: string;
			priorityFilter: string;
			labelFilter: string[];
			milestoneFilter: string;
		}) => void;
	} = {},
	injectedScreen?: ScreenInterface,
): Promise<void> {
	if (output.isTTY === false) {
		console.log(formatTaskPlainText(task));
		return;
	}
	const cwd = process.cwd();
	const core = options.core || new Core(cwd, { enableWatchers: true });
	let allTasks: Task[];
	let statuses: string[];
	let statusStyleOptions: StatusStyleOptions = {};
	// biome-ignore lint/style/useConst: assigned later after config load
	let labels: (string | LabelConfig)[];
	let availableLabels: string[] = [];
	let taskSearchIndex: ReturnType<typeof createTaskSearchIndex> | null = null;
	let searchService: Awaited<ReturnType<typeof core.getSearchService>> | null = null;
	let contentStore: Awaited<ReturnType<typeof core.getContentStore>> | null = null;
	const milestoneEntities = await core.filesystem.listMilestones();
	const { availableMilestoneTitles, resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel(milestoneEntities);
	const config = await core.filesystem.loadConfig();
	statuses = config?.statuses || ["To Do", "In Progress", "Done"];
	statusStyleOptions = statusOptionsFromConfig(config ?? undefined);
	labels = config?.labels || [];
	if (options.tasks) {
		allTasks = options.tasks.filter((t) => t.id && t.id.trim() !== "" && hasAnyPrefix(t.id));
		taskSearchIndex = createTaskSearchIndex(allTasks);
	} else {
		const loadingScreen = await createLoadingScreen("Loading tasks");
		try {
			loadingScreen?.update("Loading tasks from branches...");
			contentStore = await core.getContentStore();
			searchService = await core.getSearchService();
			loadingScreen?.update("Preparing task list...");
			const tasks = await core.queryTasks();
			allTasks = tasks.filter((t) => t.id && t.id.trim() !== "" && hasAnyPrefix(t.id));
		} finally {
			loadingScreen?.close();
		}
	}
	availableLabels = collectAvailableLabels(allTasks, labels);
	let searchQuery = options.searchQuery || "";
	let statusFilter = "";
	if (options.statusFilter) {
		const lowerFilter = options.statusFilter.toLowerCase();
		const matchedStatus = statuses.find((s) => s.toLowerCase() === lowerFilter);
		statusFilter = matchedStatus || "";
	}
	let priorityFilter = options.priorityFilter || "";
	let labelFilter: string[] = [];
	let milestoneFilter = options.milestoneFilter || "";
	let filteredTasks = [...allTasks];
	if (options.labelFilter && options.labelFilter.length > 0) {
		const availableSet = new Set(availableLabels.map((label) => label.toLowerCase()));
		labelFilter = options.labelFilter.filter((label) => availableSet.has(label.toLowerCase()));
	}
	const filtersActive = Boolean(
		searchQuery || statusFilter || priorityFilter || labelFilter.length > 0 || milestoneFilter,
	);
	let requireInitialFilterSelection = filtersActive;
	const enrichTask = (candidate: Task | null): Task | null => {
		if (!candidate) return null;
		return attachSubtaskSummaries(candidate, allTasks);
	};
	let currentSelectedTask = enrichTask(task) ?? task;
	let selectionRequestId = 0;
	let noResultsMessage: string | null = null;
	const screen = injectedScreen ?? createScreen({ title: options.title || "Backlog Tasks" });
	const ownedScreen = !injectedScreen;
	const container = box({
		parent: screen,
		width: "100%",
		height: "100%",
	});
	let currentFocus: "filters" | "list" | "detail" = "list";
	let filterPopupOpen = false;
	let modalOpen = false;
	let pendingSearchWrap: PendingSearchWrap = null;
	let filterExitPane: PaneFocus = "list";
	let filterHeader: FilterHeader;
	filterHeader = createFilterHeader({
		parent: container,
		statuses,
		availableLabels,
		availableMilestones: availableMilestoneTitles,
		initialFilters: {
			search: searchQuery,
			status: statusFilter,
			priority: priorityFilter,
			labels: labelFilter,
			milestone: milestoneFilter,
		},
		onFilterChange: (filters: FilterState) => {
			searchQuery = filters.search;
			statusFilter = filters.status;
			priorityFilter = filters.priority;
			labelFilter = filters.labels;
			milestoneFilter = filters.milestone;
			applyFilters();
			notifyFilterChange();
		},
		onFilterPickerOpen: (filterId) => {
			void openFilterPicker(filterId);
		},
	});
	filterHeader.setFocusChangeHandler((focus) => {
		if (focus !== null) {
			if (currentFocus !== "filters") {
				filterExitPane = currentFocus === "detail" ? "detail" : "list";
			}
			currentFocus = "filters";
			setActivePane("none");
			updateHelpBar();
		}
	});
	const getHeaderHeight = () => filterHeader.getHeight();
	const taskListPane = box({
		parent: container,
		top: getHeaderHeight(),
		left: 0,
		width: LAYOUT.LIST_PANE_WIDTH,
		height: `100%-${getHeaderHeight() + 1}`,
		border: { type: LAYOUT.PANE_BORDER_TYPE },
		style: { border: { fg: "gray" } },
		label: `\u00A0Tasks (${filteredTasks.length})\u00A0`,
	});
	const detailPane = box({
		parent: container,
		top: getHeaderHeight(),
		left: LAYOUT.LIST_PANE_WIDTH,
		right: 0,
		height: `100%-${getHeaderHeight() + 1}`,
		border: { type: LAYOUT.PANE_BORDER_TYPE },
		style: { border: { fg: "gray" } },
		label: "\u00A0Details\u00A0",
	});
	const helpBar = box({
		parent: container,
		bottom: 0,
		left: 0,
		width: "100%",
		height: 1,
		tags: true,
		wrap: true,
		content: "",
	});
	let transientHelpContent: string | null = null;
	let helpRestoreTimer: ReturnType<typeof setTimeout> | null = null;
	function showTransientHelp(message: string, durationMs = 3000) {
		transientHelpContent = message;
		if (helpRestoreTimer) {
			clearTimeout(helpRestoreTimer);
			helpRestoreTimer = null;
		}
		updateHelpBar();
		helpRestoreTimer = setTimeout(() => {
			transientHelpContent = null;
			helpRestoreTimer = null;
			updateHelpBar();
		}, durationMs);
	}
	function getTerminalWidth(): number {
		return typeof screen.width === "number" ? screen.width : 80;
	}
	function syncPaneLayout() {
		const headerHeight = filterHeader.getHeight();
		const footerHeight = typeof helpBar.height === "number" ? helpBar.height : 1;
		taskListPane.top = headerHeight;
		taskListPane.height = `100%-${headerHeight + footerHeight}`;
		detailPane.top = headerHeight;
		detailPane.height = `100%-${headerHeight + footerHeight}`;
	}
	function setHelpBarContent(content: string) {
		const formatted = formatFooterContent(content, getTerminalWidth());
		helpBar.height = formatted.height;
		helpBar.setContent(formatted.content);
		syncPaneLayout();
	}
	function setActivePane(active: "list" | "detail" | "none") {
		const listBorder = taskListPane.style as { border?: { fg?: string } };
		const detailBorder = detailPane.style as { border?: { fg?: string } };
		if (listBorder.border) listBorder.border.fg = active === "list" ? "yellow" : "gray";
		if (detailBorder.border) detailBorder.border.fg = active === "detail" ? "yellow" : "gray";
	}
	function focusTaskList(targetIndex?: number): void {
		if (!taskList) {
			if (detailWidgets.descriptionBox) {
				currentFocus = "detail";
				setActivePane("detail");
				detailWidgets.descriptionBox.focus();
				updateHelpBar();
				screen.render();
			}
			return;
		}
		currentFocus = "list";
		setActivePane("list");
		if (typeof targetIndex === "number") {
			taskList.setSelectedIndex(targetIndex);
		}
		taskList.focus();
		updateHelpBar();
		screen.render();
	}
	function focusDetailPane(): void {
		if (!detailWidgets.descriptionBox) return;
		currentFocus = "detail";
		setActivePane("detail");
		detailWidgets.descriptionBox.focus();
		updateHelpBar();
		screen.render();
	}
	const focusFilterControl = (filterId: FilterControlId) => {
		switch (filterId) {
			case "search":
				filterHeader.focusSearch();
				break;
			case "status":
				filterHeader.focusStatus();
				break;
			case "priority":
				filterHeader.focusPriority();
				break;
			case "milestone":
				filterHeader.focusMilestone();
				break;
			case "labels":
				filterHeader.focusLabels();
				break;
		}
	};
	const openFilterPicker = async (filterId: Exclude<FilterControlId, "search">) => {
		if (filterPopupOpen) return;
		filterPopupOpen = true;
		try {
			const state = { statusFilter, priorityFilter, labelFilter, milestoneFilter };
			await openFilterPickerImpl(
				filterId,
				screen,
				filterHeader,
				availableLabels,
				statuses,
				availableMilestoneTitles,
				state,
				applyFilters,
				notifyFilterChange,
				() => {},
			);
			statusFilter = state.statusFilter;
			priorityFilter = state.priorityFilter;
			labelFilter = state.labelFilter;
			milestoneFilter = state.milestoneFilter;
		} finally {
			filterPopupOpen = false;
			focusFilterControl(filterId);
			screen.render();
		}
	};
	filterHeader.setExitRequestHandler((direction) => {
		filterHeader.setBorderColor("cyan");
		const targetPane = resolveFilterExitPane(filterExitPane, Boolean(taskList), Boolean(detailWidgets.descriptionBox));
		if (targetPane === "list" && taskList) {
			const selected = taskList.getSelectedIndex();
			const currentIndex = Array.isArray(selected) ? selected[0] : selected;
			const targetIndex = resolveSearchExitTargetIndex(
				direction,
				pendingSearchWrap,
				filteredTasks.length,
				currentIndex,
			);
			focusTaskList(targetIndex);
		} else if (targetPane === "detail" && detailWidgets.descriptionBox) {
			focusDetailPane();
		}
		pendingSearchWrap = null;
	});
	let taskList: GenericList<Task> | null = null;
	let listEmptyStateBox: BoxInterface | null = null;
	let detailWidgets: DetailPaneWidgets = { headerDetailBox: undefined, divider: undefined, descriptionBox: undefined };
	function notifyFilterChange() {
		if (options.onFilterChange) {
			options.onFilterChange({
				searchQuery,
				statusFilter,
				priorityFilter,
				labelFilter,
				milestoneFilter,
			});
		}
	}
	function updateHelpBar() {
		if (transientHelpContent) {
			setHelpBarContent(transientHelpContent);
			screen.render();
			return;
		}
		let content = "";
		const filterFocus = filterHeader.getCurrentFocus();
		if (currentFocus === "filters" && filterFocus) {
			if (filterFocus === "search") {
				content =
					" {cyan-fg}[←/→]{/} Cursor (edge=Prev/Next) | {cyan-fg}[↑/↓]{/} Back to Tasks | {cyan-fg}[Esc]{/} Cancel | {gray-fg}(Live search){/}";
			} else {
				content = " {cyan-fg}[Enter/Space]{/} Open Picker | {cyan-fg}[←/→]{/} Prev/Next | {cyan-fg}[Esc]{/} Back";
			}
		} else if (currentFocus === "detail") {
			content =
				" {cyan-fg}[Tab]{/} View | {cyan-fg}[←]{/} List | {cyan-fg}[↑↓]{/} Scroll | {cyan-fg}[E]{/} Edit | {cyan-fg}[Y]{/} Yank | {cyan-fg}[?]{/} Help | {cyan-fg}[q]{/} Quit";
		} else if (selectedTaskIds.size > 0) {
			content = ` {green-fg}${selectedTaskIds.size} selected{/} | {cyan-fg}[A]{/} Archive | {cyan-fg}[S]{/} Status | {cyan-fg}[P]{/} Priority | {cyan-fg}[U]{/} Due Date | {cyan-fg}[M]{/} Milestone | {cyan-fg}[L]{/} Labels | {cyan-fg}[E]{/} Assignee | {cyan-fg}[Esc]{/} Clear | {cyan-fg}[?]{/} Help`;
		} else {
			content =
				" {cyan-fg}[Tab]{/} View | {cyan-fg}[/]{/} Search | {cyan-fg}[s/p/i/l]{/} Filter | {cyan-fg}[↑↓]{/} Nav | {cyan-fg}[Space]{/} Select | {cyan-fg}[C-a]{/} All | {cyan-fg}[E/C/A]{/} Edit/Comp/Arch | {cyan-fg}[Y]{/} Yank | {cyan-fg}[?]{/} Help | {cyan-fg}[q]{/} Quit";
		}
		setHelpBarContent(content);
		screen.render();
	}
	const refreshDetail = () => {
		destroyDetailWidgets(detailWidgets);
		detailWidgets = renderDetailPane(
			detailPane,
			screen,
			currentSelectedTask,
			noResultsMessage,
			currentFocus,
			statusStyleOptions,
			resolveMilestoneLabel,
			availableLabels,
			{ title: options.title },
			detailCallbacks,
		);
		screen.render();
	};
	function applyFilters() {
		const hasActiveFilters = Boolean(
			searchQuery.trim() || statusFilter || priorityFilter || labelFilter.length > 0 || milestoneFilter,
		);
		if (!hasActiveFilters) {
			filteredTasks = [...allTasks];
		} else if (taskSearchIndex) {
			filteredTasks = applyTaskFilters(
				allTasks,
				{
					query: searchQuery,
					status: statusFilter || undefined,
					priority: priorityFilter as "high" | "medium" | "low" | undefined,
					labels: labelFilter,
					milestone: milestoneFilter || undefined,
					resolveMilestoneLabel,
				},
				taskSearchIndex,
			);
		} else if (searchService) {
			const searchResults = searchService.search({
				query: searchQuery,
				filters: {
					status: statusFilter || undefined,
					priority: priorityFilter as "high" | "medium" | "low" | undefined,
					labels: labelFilter.length > 0 ? labelFilter : undefined,
				},
				types: ["task"],
			});
			filteredTasks = searchResults.filter((r): r is TaskSearchResult => r.type === "task").map((r) => r.task);
			if (milestoneFilter) {
				filteredTasks = filteredTasks.filter((t) => {
					if (milestoneFilter === NO_MILESTONE_FILTER_VALUE) return !t.milestone?.trim();
					if (!t.milestone) return false;
					return resolveMilestoneLabel(t.milestone).toLowerCase() === milestoneFilter.toLowerCase();
				});
			}
		} else {
			filteredTasks = [...allTasks];
		}
		if (taskListPane.setLabel) {
			taskListPane.setLabel(`\u00A0Tasks (${filteredTasks.length})\u00A0`);
		}
		if (filteredTasks.length === 0) {
			if (taskList) {
				taskList.destroy();
				taskList = null;
			}
			const { noResultsMessage: nrm, listPaneMessage } = buildEmptyFilterMessage(
				searchQuery,
				statusFilter,
				priorityFilter,
				labelFilter,
				milestoneFilter,
			);
			noResultsMessage = nrm;
			listEmptyStateBox = createEmptyStateBox(taskListPane, listPaneMessage);
			refreshDetail();
			return;
		}
		noResultsMessage = null;
		destroyEmptyStateBox(listEmptyStateBox);
		listEmptyStateBox = null;
		if (taskList) {
			taskList.destroy();
			taskList = null;
		}
		taskList = renderTaskList(
			taskListPane,
			screen,
			filteredTasks,
			currentSelectedTask,
			selectedTaskIds,
			statusStyleOptions,
			listCallbacks,
		);
		if (taskList) {
			const forceFirst = requireInitialFilterSelection;
			let desiredIndex = filteredTasks.findIndex((t) => t.id === currentSelectedTask.id);
			if (forceFirst || desiredIndex < 0) desiredIndex = 0;
			const desiredTask = filteredTasks[desiredIndex];
			if (desiredTask && desiredTask.id !== currentSelectedTask.id) {
				currentSelectedTask = enrichTask(desiredTask) ?? desiredTask;
				options.onTaskChange?.(currentSelectedTask);
			}
			const currentIndexRaw = taskList.getSelectedIndex();
			const currentIndex = Array.isArray(currentIndexRaw) ? (currentIndexRaw[0] ?? 0) : currentIndexRaw;
			if (forceFirst || currentIndex !== desiredIndex) {
				taskList.setSelectedIndex(desiredIndex);
			}
			requireInitialFilterSelection = false;
		}
		refreshDetail();
	}
	let selectedTaskIds = new Set<string>();
	const getSelectedTaskIdsFn = (): string[] => filteredTasks.filter((t) => selectedTaskIds.has(t.id)).map((t) => t.id);
	const applySelection = async (selectedTask: Task | null) => {
		if (!selectedTask) return;
		if (currentSelectedTask && selectedTask.id === currentSelectedTask.id) return;
		const enriched = enrichTask(selectedTask);
		currentSelectedTask = enriched ?? selectedTask;
		options.onTaskChange?.(currentSelectedTask);
		const requestId = ++selectionRequestId;
		refreshDetail();
		const refreshed = await core.getTaskWithSubtasks(selectedTask.id, allTasks);
		if (requestId !== selectionRequestId) return;
		if (refreshed) {
			currentSelectedTask = refreshed;
			options.onTaskChange?.(refreshed);
		}
		refreshDetail();
	};
	const openCurrentTaskInEditor = async () => {
		const result = await openCurrentTaskInEditorImpl(
			screen,
			core,
			filterPopupOpen,
			currentFocus,
			noResultsMessage,
			currentSelectedTask,
			showTransientHelp,
			enrichTask,
			allTasks,
			taskSearchIndex,
			applyFilters,
			options.onTaskChange ?? null,
		);
		currentSelectedTask = result.currentSelectedTask;
		allTasks = result.allTasks;
		taskSearchIndex = result.taskSearchIndex;
	};
	const getCurrentShortcutTask = (): Task | null => {
		if (noResultsMessage) return null;
		return resolveTaskListSelection(filteredTasks, taskList?.getSelectedIndex(), currentSelectedTask);
	};
	const removeTaskFromCurrentView = (taskId: string) => {
		const r = removeTaskFromCurrentViewImpl(
			taskId,
			allTasks,
			filteredTasks,
			taskSearchIndex,
			currentSelectedTask,
			enrichTask,
			options.onTaskChange ?? null,
		);
		allTasks = r.allTasks;
		filteredTasks = r.filteredTasks;
		taskSearchIndex = r.taskSearchIndex;
		currentSelectedTask = r.currentSelectedTask;
		applyFilters();
	};
	const runWithModalGuard = async <T>(operation: () => Promise<T>): Promise<T> => {
		modalOpen = true;
		try {
			return await operation();
		} finally {
			modalOpen = false;
		}
	};
	const clearSelection = () => {
		selectedTaskIds = new Set();
		taskList?.updateItems(filteredTasks);
		updateHelpBar();
		screen.render();
	};
	const executeBulkAction = async (_action: "archive") => {
		const ids = getSelectedTaskIdsFn();
		await executeBulkActionImpl("archive", core, screen, ids, runWithModalGuard, showTransientHelp, () => {
			for (const id of ids) allTasks = allTasks.filter((t) => t.id !== id);
			if (taskSearchIndex) taskSearchIndex = createTaskSearchIndex(allTasks);
			clearSelection();
			applyFilters();
		});
	};
	const executeBulkUpdate = async (field: string) => {
		const ids = getSelectedTaskIdsFn();
		await executeBulkUpdateImpl(field, core, screen, ids, runWithModalGuard, showTransientHelp, () => {
			if (taskSearchIndex) taskSearchIndex = createTaskSearchIndex(allTasks);
			clearSelection();
			applyFilters();
		});
	};
	const applyTaskLifecycleShortcut = (_key: string) =>
		applyTaskLifecycleShortcutImpl(
			_key,
			core,
			screen,
			getCurrentShortcutTask,
			showTransientHelp,
			runWithModalGuard,
			removeTaskFromCurrentView,
		);
	screen.on("resize", () => {
		filterHeader.rebuild();
		updateHelpBar();
	});
	function canHandleKey(): boolean {
		return !modalOpen && !filterPopupOpen && currentFocus !== "filters";
	}
	function cleanupViewer(): void {
		searchService?.dispose();
		contentStore?.dispose();
		filterHeader.destroy();
		if (ownedScreen) screen.destroy();
	}
	const handleEscape = () => {
		if (modalOpen || filterPopupOpen) return;
		if (currentFocus === "filters") {
			filterHeader.setBorderColor("cyan");
			const tgt = resolveFilterExitPane(filterExitPane, Boolean(taskList), Boolean(detailWidgets.descriptionBox));
			if (tgt === "list" && taskList) focusTaskList();
			else if (tgt === "detail" && detailWidgets.descriptionBox) focusDetailPane();
		} else if (currentFocus !== "list") {
			if (taskList) focusTaskList();
		} else if (selectedTaskIds.size > 0) clearSelection();
		else {
			cleanupViewer();
			process.exit(0);
		}
	};
	const sr = () => screen.render();
	const setC = (f: "list" | "detail" | "filters") => {
		currentFocus = f;
	};
	const setW = (w: PendingSearchWrap) => {
		pendingSearchWrap = w;
	};
	const fSI = () => {
		pendingSearchWrap = null;
		filterHeader.focusSearch();
	};
	const listCallbacks: TaskListPaneCallbacks = {
		onSelectionChange: applySelection,
		getSelectedTaskIds: () => selectedTaskIds,
		getCurrentFocus: () => currentFocus,
		setCurrentFocus: setC,
		setActivePane,
		setPendingSearchWrap: setW,
		focusDetailPane,
		focusSearchInput: fSI,
		updateHelpBar,
		screenRender: sr,
	};
	const detailCallbacks: DetailPaneCallbacks = {
		getCurrentFocus: () => currentFocus,
		setCurrentFocus: setC,
		setPendingSearchWrap: setW,
		focusTaskList,
		focusSearchInput: fSI,
		setActivePane,
		updateHelpBar,
		screenRender: sr,
	};
	const kbc = {
		canHandleKey,
		getCurrentFocus: () => currentFocus,
		getModalOpen: () => modalOpen,
		getSelectedTaskIds: () => selectedTaskIds,
		openFilterPicker: async (c: string) => {
			await openFilterPicker(c as Exclude<FilterControlId, "search">);
		},
		applyTaskLifecycleShortcut,
		openCurrentTaskInEditor,
		executeBulkAction: () => executeBulkAction("archive"),
		executeBulkUpdate,
		copyCurrentTaskId: async () => {
			const task = getCurrentShortcutTask();
			if (!task) return;
			showTransientHelp(
				(await copyToClipboard(task.id))
					? ` {green-fg}Copied ${task.id} to clipboard{/}`
					: " {red-fg}Failed to copy to clipboard{/}",
			);
		},
		showHelp: async () => {
			await runWithModalGuard(() => openHelpPopup(screen, "task-list"));
		},
		cleanupAndQuit: () => {
			cleanupViewer();
			process.exit(0);
		},
		handleTabSwitch: options.onTabPress
			? async () => {
					cleanupViewer();
					await options.onTabPress?.();
				}
			: undefined,
		handleEscape,
		updateHelpBar,
		focusSearchInput: fSI,
	} satisfies KeybindingCallbacks;
	registerViewerKeybindings(screen, kbc);
	updateHelpBar();
	if (filtersActive) applyFilters();
	else
		taskList = renderTaskList(
			taskListPane,
			screen,
			filteredTasks,
			currentSelectedTask,
			selectedTaskIds,
			statusStyleOptions,
			listCallbacks,
		);
	detailWidgets = renderDetailPane(
		detailPane,
		screen,
		currentSelectedTask,
		noResultsMessage,
		currentFocus,
		statusStyleOptions,
		resolveMilestoneLabel,
		availableLabels,
		{ title: options.title },
		detailCallbacks,
	);
	if (options.startWithSearchFocus) filterHeader.focusSearch();
	else if (options.startWithDetailFocus) {
		if (detailWidgets.descriptionBox) focusDetailPane();
	} else if (taskList) focusTaskList();
	screen.render();
	return new Promise<void>((resolve) => {
		screen.on("destroy", () => {
			if (helpRestoreTimer) {
				clearTimeout(helpRestoreTimer);
				helpRestoreTimer = null;
			}
			searchService?.dispose();
			contentStore?.dispose();
			resolve();
		});
	});
}
export async function createTaskPopup(
	screen: ScreenInterface,
	task: Task,
	resolveMilestoneLabel?: (milestone: string) => string,
	statusStyleOptions?: StatusStyleOptions,
): Promise<{
	background: BoxInterface;
	popup: BoxInterface;
	contentArea: ScrollableTextInterface;
	close: () => void;
} | null> {
	if (output.isTTY === false) return null;
	return createTaskPopupImpl({
		screen,
		task,
		resolveMilestoneLabel: resolveMilestoneLabel ?? ((m: string) => m),
		statusStyleOptions: statusStyleOptions ?? {},
		availableLabels: [],
	});
}
