import type { ScreenInterface } from "neo-neo-bblessed";
import { box, textbox } from "neo-neo-bblessed";
import { Core } from "../core/backlog.ts";
import { createPopupChrome } from "./components/filter-popup.ts";

export async function openCreateMilestoneScreen(screen: ScreenInterface): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		let settled = false;
		const { popup, close } = createPopupChrome({
			screen,
			title: "Create Milestone",
			helpText: " {cyan-fg}[Enter]{/} Next / Submit | {cyan-fg}[Esc]{/} Cancel",
			width: "55%",
			height: 10,
		});

		box({
			parent: popup,
			top: 1,
			left: 1,
			height: 1,
			width: 14,
			content: "Name:",
			tags: true,
		});

		const nameInput = textbox({
			parent: popup,
			top: 1,
			left: 15,
			width: "100%-17",
			height: 1,
			inputOnFocus: false,
			mouse: true,
			keys: true,
			style: {
				fg: "white",
				bg: "black",
				focus: { fg: "black", bg: "cyan", bold: true },
			},
		});

		box({
			parent: popup,
			top: 3,
			left: 1,
			height: 1,
			width: 14,
			content: "Description:",
			tags: true,
		});

		const descInput = textbox({
			parent: popup,
			top: 3,
			left: 15,
			width: "100%-17",
			height: 1,
			inputOnFocus: false,
			mouse: true,
			keys: true,
			style: {
				fg: "white",
				bg: "black",
				focus: { fg: "black", bg: "cyan", bold: true },
			},
		});

		const finish = (created: boolean) => {
			if (settled) return;
			settled = true;
			nameInput.destroy();
			descInput.destroy();
			close();
			screen.render();
			resolve(created);
		};

		nameInput.on("submit", (_value: unknown) => {
			nameInput.cancel();
			descInput.readInput?.();
			descInput.focus();
		});

		descInput.on("submit", async (_value: unknown) => {
			if (settled) return;
			const name = (nameInput.getValue?.() ?? "").trim();
			if (!name) {
				nameInput.readInput?.();
				nameInput.focus();
				return;
			}
			const description = (descInput.getValue?.() ?? "").trim();
			try {
				const core = new Core(process.cwd(), { enableWatchers: true });
				await core.filesystem.createMilestone(name, description || undefined);
				finish(true);
			} catch {
				finish(false);
			}
		});

		nameInput.on("focus", () => {
			nameInput.readInput?.();
		});

		descInput.on("focus", () => {
			descInput.readInput?.();
		});

		popup.key(["escape", "q"], () => {
			finish(false);
			return false;
		});

		setImmediate(() => {
			nameInput.focus();
			screen.render();
		});
	});
}
