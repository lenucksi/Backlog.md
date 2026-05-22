import type { ScreenInterface } from "neo-neo-bblessed";
import { box, textbox } from "neo-neo-bblessed";
import { createPopupChrome } from "./components/filter-popup.ts";
import { Core } from "../core/backlog.ts";

export async function openCreateDocumentScreen(screen: ScreenInterface): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		let settled = false;
		const { popup, close } = createPopupChrome({
			screen,
			title: "Create Document",
			helpText:
				" {cyan-fg}[Enter]{/} Next / Submit | {cyan-fg}[Esc]{/} Cancel",
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
			content: "Path (opt):",
			tags: true,
		});

		const pathInput = textbox({
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
			titleInput.destroy();
			pathInput.destroy();
			close();
			screen.render();
			resolve(created);
		};

		titleInput.on("submit", (_value: unknown) => {
			titleInput.cancel();
			pathInput.readInput?.();
			pathInput.focus();
		});

		pathInput.on("submit", async (_value: unknown) => {
			if (settled) return;
			const title = (titleInput.getValue?.() ?? "").trim();
			if (!title) {
				titleInput.readInput?.();
				titleInput.focus();
				return;
			}
			const path = (pathInput.getValue?.() ?? "").trim() || undefined;
			try {
				const core = new Core(process.cwd(), { enableWatchers: true });
				await core.createDocumentFromInput({ title, path, content: "" }, false);
				finish(true);
			} catch {
				finish(false);
			}
		});

		titleInput.on("focus", () => {
			titleInput.readInput?.();
		});

		pathInput.on("focus", () => {
			pathInput.readInput?.();
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
