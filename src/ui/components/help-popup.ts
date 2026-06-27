import type { ScreenInterface } from "neo-neo-bblessed";
import { box } from "neo-neo-bblessed";
import { createPopupChrome } from "./filter-popup.ts";

export type HelpPopupContext = "board" | "task-list";

type Shortcut = {
	key: string;
	desc: string;
};

const BOARD_SHORTCUTS: Shortcut[] = [
	{ key: "Tab", desc: "Switch View (Kanban/List)" },
	{ key: "/", desc: "Search tasks" },
	{ key: "P", desc: "Filter by Priority" },
	{ key: "F", desc: "Filter by Labels" },
	{ key: "I", desc: "Filter by Milestone" },
	{ key: "←→", desc: "Navigate columns" },
	{ key: "↑↓", desc: "Navigate tasks" },
	{ key: "Space", desc: "Toggle selection" },
	{ key: "C-a", desc: "Select all tasks" },
	{ key: "Enter", desc: "View task details" },
	{ key: "E", desc: "Edit task / Bulk assignee" },
	{ key: "m", desc: "Create Milestone" },
	{ key: "d", desc: "Create Draft" },
	{ key: "D", desc: "Create Document" },
	{ key: "M", desc: "Move task (Status/Order)" },
	{ key: "A", desc: "Archive task(s)" },
	{ key: "S", desc: "Set status (bulk)" },
	{ key: "U", desc: "Due Date (bulk)" },
	{ key: "Y", desc: "Yank (Copy) task ID" },
	{ key: "N", desc: "Create new task" },
	{ key: "?", desc: "Show this help menu" },
	{ key: "q/Esc", desc: "Quit / Close / Clear selection" },
];

const TASK_LIST_SHORTCUTS: Shortcut[] = [
	{ key: "Tab", desc: "Switch View (Kanban/List)" },
	{ key: "/", desc: "Search tasks" },
	{ key: "s", desc: "Filter/Bulk status" },
	{ key: "p", desc: "Filter/Bulk priority" },
	{ key: "l", desc: "Filter/Bulk labels" },
	{ key: "i", desc: "Filter/Bulk milestone" },
	{ key: "↑↓", desc: "Navigate tasks" },
	{ key: "←→", desc: "Switch between list and details" },
	{ key: "Space", desc: "Toggle selection" },
	{ key: "C-a", desc: "Select all" },
	{ key: "Enter", desc: "Focus task details" },
	{ key: "E", desc: "Edit task / Bulk assignee" },
	{ key: "A", desc: "Archive task(s)" },
	{ key: "U", desc: "Due Date (bulk)" },
	{ key: "Y", desc: "Yank (Copy) task ID" },
	{ key: "N", desc: "Create new task" },
	{ key: "?", desc: "Show this help menu" },
	{ key: "q/Esc", desc: "Quit / Clear selection" },
];

export function getHelpShortcuts(context: HelpPopupContext = "board"): Shortcut[] {
	return context === "task-list" ? TASK_LIST_SHORTCUTS : BOARD_SHORTCUTS;
}

export async function openHelpPopup(screen: ScreenInterface, context: HelpPopupContext = "board"): Promise<void> {
	return new Promise<void>((resolve) => {
		let settled = false;
		const { popup, close } = createPopupChrome({
			screen,
			title: "Keyboard Shortcuts",
			helpText: " {cyan-fg}[Esc/q]{/} Close Help",
			width: 60,
			height: 20,
		});

		const shortcuts = getHelpShortcuts(context);

		const content = shortcuts.map((s) => `{cyan-fg}[${s.key.padStart(5)}]{/} ${s.desc}`).join("\n");

		box({
			parent: popup,
			top: 1,
			left: 2,
			right: 2,
			bottom: 1,
			content,
			tags: true,
		});

		const finish = () => {
			if (settled) return;
			settled = true;
			close();
			screen.render();
			resolve();
		};

		popup.key(["escape", "q", "Q", "?"], () => {
			finish();
			return false;
		});

		setImmediate(() => {
			popup.focus();
			screen.render();
		});
	});
}
