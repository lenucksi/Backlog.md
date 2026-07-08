/* Task list pane rendering for the task viewer */

import type { BoxInterface, ScreenInterface } from "neo-neo-bblessed";
import { box } from "neo-neo-bblessed";
import type { Task } from "../types/index.ts";
import { createGenericList, type GenericList } from "./components/generic-list.ts";
import { formatStatusWithIcon, getStatusColor, type StatusStyleOptions } from "./status-icon.ts";
import { getPriorityDisplay } from "./task-detail-content.ts";
import { LAYOUT } from "./task-viewer-layout.ts";
import {
	type PendingSearchWrap,
	resolveTaskListSelection,
	shouldMoveFromListBoundaryToSearch,
} from "./task-viewer-state.ts";

export interface TaskListPaneCallbacks {
	onSelectionChange(task: Task | null): Promise<void>;
	getSelectedTaskIds(): Set<string>;
	getCurrentFocus(): "list" | "detail" | "filters";
	setCurrentFocus(focus: "list" | "detail" | "filters"): void;
	setActivePane(pane: "list" | "detail" | "none"): void;
	setPendingSearchWrap(wrap: PendingSearchWrap): void;
	focusDetailPane(): void;
	focusSearchInput(): void;
	updateHelpBar(): void;
	screenRender(): void;
}

export function renderTaskList(
	taskListPane: BoxInterface,
	_screen: ScreenInterface,
	filteredTasks: Task[],
	currentSelectedTask: Task,
	_selectedTaskIds: Set<string>,
	statusStyleOptions: StatusStyleOptions,
	callbacks: TaskListPaneCallbacks,
): GenericList<Task> | null {
	const initialIndex = Math.max(
		0,
		filteredTasks.findIndex((t) => t.id === currentSelectedTask.id),
	);

	const taskList = createGenericList<Task>({
		parent: taskListPane,
		title: "",
		items: filteredTasks,
		selectedIndex: initialIndex,
		border: false,
		top: LAYOUT.EMPTY_STATE_PADDING.top,
		left: LAYOUT.EMPTY_STATE_PADDING.left,
		width: LAYOUT.LIST_ITEM_WIDTH,
		height: LAYOUT.LIST_ITEM_HEIGHT,
		itemRenderer: (task: Task) => {
			const ids = callbacks.getSelectedTaskIds();
			const checkbox = ids.has(task.id) ? "{green-fg}[✓]{/}" : "{gray-fg}[ ]{/}";
			const statusIcon = formatStatusWithIcon(task.status, statusStyleOptions);
			const statusColor = getStatusColor(task.status, statusStyleOptions);
			const assigneeText = task.assignee?.length
				? ` {cyan-fg}${task.assignee[0]?.startsWith("@") ? task.assignee[0] : `@${task.assignee[0]}`}{/}`
				: "";
			const labelsText = task.labels?.length ? ` {yellow-fg}[${task.labels.join(", ")}]{/}` : "";
			const priorityText = getPriorityDisplay(task.priority);
			const isCrossBranch = Boolean((task as Task & { branch?: string }).branch);
			const branchText = isCrossBranch ? ` {green-fg}(${(task as Task & { branch?: string }).branch}){/}` : "";

			const content = `${checkbox} {${statusColor}-fg}${statusIcon}{/} {bold}${task.id}{/bold} - ${task.title}${priorityText}${assigneeText}${labelsText}${branchText}`;
			return isCrossBranch ? `{gray-fg}${content}{/}` : content;
		},
		onSelect: (selected: Task | Task[]) => {
			const selectedTask = Array.isArray(selected) ? selected[0] : selected;
			void callbacks.onSelectionChange(selectedTask || null);
		},
		onHighlight: (selected: Task | null) => {
			void callbacks.onSelectionChange(selected);
		},
		onBoundaryNavigation: (direction, selectedIndex, total) => {
			if (!shouldMoveFromListBoundaryToSearch(direction, selectedIndex, total)) {
				return false;
			}
			callbacks.setPendingSearchWrap(direction === "up" ? "to-last" : "to-first");
			callbacks.focusSearchInput();
			return true;
		},
		showHelp: false,
	});

	if (taskList) {
		const listBox = taskList.getListBox();
		listBox.on("focus", () => {
			callbacks.setCurrentFocus("list");
			callbacks.setActivePane("list");
			callbacks.updateHelpBar();
			callbacks.screenRender();
		});
		listBox.on("blur", () => {
			callbacks.setActivePane("none");
			callbacks.screenRender();
		});
		listBox.key(["right", "l"], () => {
			callbacks.focusDetailPane();
			return false;
		});
		listBox.key(["space"], () => {
			const ids = callbacks.getSelectedTaskIds();
			const selected = resolveTaskListSelection(filteredTasks, taskList?.getSelectedIndex(), currentSelectedTask);
			if (!selected) return false;
			if (ids.has(selected.id)) {
				ids.delete(selected.id);
			} else {
				ids.add(selected.id);
			}
			taskList?.updateItems(filteredTasks);
			callbacks.screenRender();
			return false;
		});
		listBox.key(["C-a"], () => {
			const ids = callbacks.getSelectedTaskIds();
			if (ids.size === filteredTasks.length) {
				ids.clear();
			} else {
				ids.clear();
				for (const t of filteredTasks) {
					ids.add(t.id);
				}
			}
			taskList?.updateItems(filteredTasks);
			callbacks.updateHelpBar();
			callbacks.screenRender();
			return false;
		});
	}

	return taskList;
}

export function createEmptyStateBox(taskListPane: BoxInterface, message: string): BoxInterface {
	return box({
		parent: taskListPane,
		top: LAYOUT.EMPTY_STATE_PADDING.top,
		left: LAYOUT.EMPTY_STATE_PADDING.left,
		width: LAYOUT.LIST_ITEM_WIDTH,
		height: LAYOUT.LIST_ITEM_HEIGHT,
		content: message,
		tags: true,
		style: { fg: "gray" },
	});
}

export function destroyEmptyStateBox(listEmptyStateBox: BoxInterface | null): void {
	if (listEmptyStateBox) {
		listEmptyStateBox.destroy();
	}
}
