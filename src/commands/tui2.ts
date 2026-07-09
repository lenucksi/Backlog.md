import { ensureSolidTransformPlugin } from "@opentui/solid/bun-plugin";
import type { Command } from "commander";
import { requireProjectRoot } from "../utils/cli-context.ts";

export function registerTui2Command(program: Command): void {
	program
		.command("tui2")
		.description("experimental opentui-based TUI")
		.action(async () => {
			const cwd = await requireProjectRoot();
			// Must register the plugin before any solid-js imports are resolved,
			// so it can intercept server.js → solid.js redirects.
			ensureSolidTransformPlugin();
			const { startTui2 } = await import("../tui2/app.tsx");
			await startTui2(cwd);
		});
}
