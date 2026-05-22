import type { ScreenInterface } from "neo-neo-bblessed";
import { box, textbox } from "neo-neo-bblessed";
import type { Core } from "../core/backlog.ts";
import type { Task } from "../types/index.ts";
import { createPopupChrome } from "./components/filter-popup.ts";

const PRIORITIES = ["low", "medium", "high"] as const;

function cycleItem<T>(items: readonly T[], current: T, direction: -1 | 1): T {
	const index = items.indexOf(current);
	if (index === -1) {
		return items[0] ?? current;
	}
	return items[(index + direction + items.length) % items.length] ?? current;
}

export async function openCreateTaskPopup(
	screen: ScreenInterface,
	core: Core,
	statuses: string[],
): Promise<Task | null> {
	return new Promise<Task | null>((resolve) => {
		let settled = false;
		let titleValue = "";
		let descValue = "";
		let currentStatus = statuses[0] ?? "To Do";
		let currentPriority = "medium";
		let activeFieldIndex = 0;

		const { popup, close: closeChrome } = createPopupChrome({
			screen,
			title: "Create Task",
			helpText:
				" {cyan-fg}[Tab]{/} Next | {cyan-fg}[Enter]{/} Submit | {cyan-fg}[Esc]{/} Cancel | {cyan-fg}[←→]{/} Cycle",
			width: 60,
			height: 14,
		});

		box({ parent: popup, top: 1, left: 2, height: 1, content: "Title:", tags: true });
		const titleInput = textbox({
			parent: popup,
			top: 2,
			left: 2,
			width: "100%-4",
			height: 1,
			inputOnFocus: false,
			keys: true,
			mouse: true,
			style: { fg: "white", bg: "default", focus: { bg: "blue", fg: "white", bold: true } },
		});

		box({ parent: popup, top: 3, left: 2, height: 1, content: "Description:", tags: true });
		const descInput = textbox({
			parent: popup,
			top: 4,
			left: 2,
			width: "100%-4",
			height: 1,
			inputOnFocus: false,
			keys: true,
			mouse: true,
			style: { fg: "white", bg: "default", focus: { bg: "blue", fg: "white", bold: true } },
		});

		box({ parent: popup, top: 5, left: 2, height: 1, content: "Status:", tags: true });
		const statusBox = box({
			parent: popup,
			top: 5,
			left: 12,
			width: 20,
			height: 1,
			content: `{cyan-fg}${currentStatus}{/}`,
			tags: true,
			style: { bg: "default", focus: { bg: "blue" } },
		});

		box({ parent: popup, top: 6, left: 2, height: 1, content: "Priority:", tags: true });
		const priorityBox = box({
			parent: popup,
			top: 6,
			left: 12,
			width: 20,
			height: 1,
			content: `{cyan-fg}${currentPriority}{/}`,
			tags: true,
			style: { bg: "default", focus: { bg: "blue" } },
		});

		box({
			parent: popup,
			bottom: 1,
			left: 2,
			height: 1,
			content: " {green-fg}[Enter]{/} Submit",
			tags: true,
		});

		const errorBox = box({
			parent: popup,
			bottom: 1,
			left: 16,
			right: 2,
			height: 1,
			content: "",
			tags: true,
			style: { fg: "red" },
		});

		const finish = (task: Task | null) => {
			if (settled) return;
			settled = true;
			closeChrome();
			screen.render();
			resolve(task);
		};

		const doSubmit = async () => {
			const title = titleValue || String(titleInput.getValue?.() ?? "").trim();
			if (!title) {
				errorBox.setContent("Title is required");
				screen.render();
				return;
			}

			try {
				const result = await core.createTaskFromInput({
					title,
					description: descValue || String(descInput.getValue?.() ?? "").trim() || undefined,
					status: currentStatus,
					priority: currentPriority as "low" | "medium" | "high",
				});
				finish(result.task);
			} catch (err) {
				const msg = err instanceof Error ? err.message : "Unknown error";
				errorBox.setContent(` {red-fg}${msg}{/}`);
				screen.render();
			}
		};

		const saveAndMove = (toIndex: number) => {
			if (activeFieldIndex === 0) {
				titleValue = String(titleInput.getValue?.() ?? "").trim();
				titleInput.cancel?.();
			} else if (activeFieldIndex === 1) {
				descValue = String(descInput.getValue?.() ?? "").trim();
				descInput.cancel?.();
			}
			activeFieldIndex = toIndex;
			if (toIndex < 2) {
				const target = toIndex === 0 ? titleInput : descInput;
				target.focus();
				target.readInput?.();
			} else {
				(toIndex === 2 ? statusBox : priorityBox).focus();
			}
			screen.render();
		};

		titleInput.on("submit", () => {
			titleValue = String(titleInput.getValue?.() ?? "").trim();
			saveAndMove(1);
		});
		titleInput.on("focus", () => {
			activeFieldIndex = 0;
			titleInput.readInput?.();
		});
		titleInput.on("blur", () => {
			titleValue = String(titleInput.getValue?.() ?? titleValue).trim();
		});
		titleInput.key(["tab"], () => {
			titleInput.cancel?.();
			saveAndMove(1);
			return false;
		});
		titleInput.key(["S-tab"], () => {
			titleInput.cancel?.();
			saveAndMove(3);
			return false;
		});

		descInput.on("submit", () => {
			descValue = String(descInput.getValue?.() ?? "").trim();
			void doSubmit();
		});
		descInput.on("focus", () => {
			activeFieldIndex = 1;
			descInput.readInput?.();
		});
		descInput.on("blur", () => {
			descValue = String(descInput.getValue?.() ?? descValue).trim();
		});
		descInput.key(["tab"], () => {
			descInput.cancel?.();
			saveAndMove(2);
			return false;
		});
		descInput.key(["S-tab"], () => {
			descInput.cancel?.();
			saveAndMove(0);
			return false;
		});

		popup.key(["tab"], () => {
			if (activeFieldIndex < 2) return false;
			saveAndMove((activeFieldIndex + 1) % 4);
			return false;
		});
		popup.key(["S-tab"], () => {
			if (activeFieldIndex < 2) return false;
			saveAndMove((activeFieldIndex + 3) % 4);
			return false;
		});
		popup.key(["escape", "q"], () => {
			finish(null);
			return false;
		});
		popup.key(["enter"], () => {
			if (activeFieldIndex < 2) return false;
			void doSubmit();
			return false;
		});
		popup.key(["left"], () => {
			if (activeFieldIndex === 2) {
				currentStatus = cycleItem(statuses, currentStatus, -1);
				statusBox.setContent(`{cyan-fg}${currentStatus}{/}`);
				screen.render();
			} else if (activeFieldIndex === 3) {
				currentPriority = cycleItem(PRIORITIES, currentPriority as (typeof PRIORITIES)[number], -1);
				priorityBox.setContent(`{cyan-fg}${currentPriority}{/}`);
				screen.render();
			}
			return false;
		});
		popup.key(["right"], () => {
			if (activeFieldIndex === 2) {
				currentStatus = cycleItem(statuses, currentStatus, 1);
				statusBox.setContent(`{cyan-fg}${currentStatus}{/}`);
				screen.render();
			} else if (activeFieldIndex === 3) {
				currentPriority = cycleItem(PRIORITIES, currentPriority as (typeof PRIORITIES)[number], 1);
				priorityBox.setContent(`{cyan-fg}${currentPriority}{/}`);
				screen.render();
			}
			return false;
		});

		setImmediate(() => {
			titleInput.focus();
			titleInput.readInput?.();
			screen.render();
		});
	});
}
