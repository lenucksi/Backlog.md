import type { ScreenInterface } from "neo-neo-bblessed";
import { box, textbox } from "neo-neo-bblessed";
import { Core } from "../core/backlog.ts";
import { createPopupChrome } from "./components/filter-popup.ts";

export async function openCreateDraftScreen(screen: ScreenInterface): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		let settled = false;
		const { popup, close } = createPopupChrome({
			screen,
			title: "Create Draft",
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
			content: "Title:",
			tags: true,
		});

		const titleInput = textbox({
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
			content: "Status:",
			tags: true,
		});

		const statusInput = textbox({
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
			value: "Draft",
		});

		const finish = (created: boolean) => {
			if (settled) return;
			settled = true;
			titleInput.destroy();
			statusInput.destroy();
			close();
			screen.render();
			resolve(created);
		};

		titleInput.on("submit", (_value: unknown) => {
			titleInput.cancel();
			statusInput.readInput?.();
			statusInput.focus();
		});

		statusInput.on("submit", async (_value: unknown) => {
			if (settled) return;
			const title = (titleInput.getValue?.() ?? "").trim();
			if (!title) {
				titleInput.readInput?.();
				titleInput.focus();
				return;
			}
			const status = (statusInput.getValue?.() ?? "Draft").trim();
			try {
				const core = new Core(process.cwd(), { enableWatchers: true });
				await core.createTaskFromInput({ title, status }, false);
				finish(true);
			} catch {
				finish(false);
			}
		});

		titleInput.on("focus", () => {
			titleInput.readInput?.();
		});

		statusInput.on("focus", () => {
			statusInput.readInput?.();
		});

		popup.key(["escape", "q"], () => {
			finish(false);
			return false;
		});

		setImmediate(() => {
			titleInput.focus();
			screen.render();
		});
	});
}
