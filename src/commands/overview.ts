import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { getTaskStatistics } from "../core/statistics.ts";
import { createLoadingScreen } from "../ui/loading.ts";
import { renderOverviewTui } from "../ui/overview-tui.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";

export function formatTime(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

export async function runOverviewCommand(core: Core): Promise<void> {
	const startTime = performance.now();

	// Load tasks with loading screen
	const loadingScreen = await createLoadingScreen("Loading project statistics");

	try {
		// Use the shared task loading logic
		const loadStart = performance.now();
		const {
			tasks: activeTasks,
			drafts,
			statuses,
			terminalStatuses,
			blockedStatuses,
		} = await core.loadAllTasksForStatistics((msg) =>
			loadingScreen?.update(`${msg} in ${formatTime(performance.now() - loadStart)}`),
		);

		loadingScreen?.close();

		// Calculate statistics
		const statsStart = performance.now();
		const statistics = getTaskStatistics(activeTasks, drafts, statuses, terminalStatuses, undefined, blockedStatuses);
		const statsTime = Math.round(performance.now() - statsStart);

		// Display the TUI
		const totalTime = Math.round(performance.now() - startTime);
		console.log(`\nPerformance summary: Total time ${totalTime}ms (stats calculation: ${statsTime}ms)`);

		const config = await core.filesystem.loadConfig();
		await renderOverviewTui(statistics, config?.projectName || "Project");
	} catch (error) {
		loadingScreen?.close();
		throw error;
	}
}

export function registerOverviewCommand(program: Command): void {
	program
		.command("overview")
		.description("display project statistics and metrics")
		.action(async () => {
			try {
				const cwd = await requireProjectRoot();
				const core = new Core(cwd);
				const config = await core.filesystem.loadConfig();

				if (!config) {
					console.error("No backlog project found. Initialize one first with: backlog init");
					process.exit(1);
				}

				await runOverviewCommand(core);
			} catch (err) {
				console.error("Failed to display project overview", err);
				process.exitCode = 1;
			}
		});
}
