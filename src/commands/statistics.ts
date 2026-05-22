import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { getTaskStatistics } from "../core/statistics.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";

function renderTable(stats: ReturnType<typeof getTaskStatistics>, milestoneLabel?: string): string {
	const lines: string[] = [];
	const scope = milestoneLabel ? ` (milestone: ${milestoneLabel})` : "";
	lines.push(`Backlog Statistics${scope}`);
	lines.push("─".repeat(40));
	lines.push(`Total tasks:       ${stats.totalTasks}`);
	lines.push(`Completed tasks:   ${stats.completedTasks}`);
	lines.push(`Completion:        ${stats.completionPercentage}%`);
	lines.push(`Drafts:            ${stats.draftCount}`);
	lines.push("");

	lines.push("By Status:");
	for (const [status, count] of stats.statusCounts) {
		if (count > 0) {
			lines.push(`  ${status.padEnd(20)} ${count}`);
		}
	}
	lines.push("");

	lines.push("By Priority:");
	for (const [priority, count] of stats.priorityCounts) {
		if (count > 0) {
			const label = priority === "none" ? "none" : priority;
			lines.push(`  ${label.padEnd(20)} ${count}`);
		}
	}
	lines.push("");

	lines.push(`Average task age:  ${stats.projectHealth.averageTaskAge} days`);
	if (stats.projectHealth.staleTasks.length > 0) {
		lines.push(`Stale tasks:      ${stats.projectHealth.staleTasks.length}`);
	}
	if (stats.projectHealth.blockedTasks.length > 0) {
		lines.push(`Blocked tasks:    ${stats.projectHealth.blockedTasks.length}`);
	}

	return lines.join("\n");
}

async function handleStatsCommand(options: { json?: boolean; milestone?: string }) {
	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	await core.ensureConfigLoaded();

	const { tasks, drafts, statuses, terminalStatuses } = await core.loadAllTasksForStatistics();

	const filteredTasks = options.milestone
		? tasks.filter((t) => {
				if (!t.milestone) return false;
				return t.milestone.toLowerCase() === options.milestone!.toLowerCase();
			})
		: tasks;

	const stats = getTaskStatistics(filteredTasks, drafts, statuses, terminalStatuses);

	if (options.json) {
		const data = {
			totalTasks: stats.totalTasks,
			completedTasks: stats.completedTasks,
			completionPercentage: stats.completionPercentage,
			draftCount: stats.draftCount,
			statusCounts: Object.fromEntries(stats.statusCounts),
			priorityCounts: Object.fromEntries(stats.priorityCounts),
			averageTaskAge: stats.projectHealth.averageTaskAge,
			staleTaskCount: stats.projectHealth.staleTasks.length,
			blockedTaskCount: stats.projectHealth.blockedTasks.length,
		};
		console.log(JSON.stringify(data, null, 2));
		return;
	}

	console.log(renderTable(stats, options.milestone));
}

export function registerStatsCommand(program: Command): void {
	program
		.command("stats")
		.description("display backlog statistics")
		.option("--json", "output as JSON")
		.option("--milestone <name>", "scope statistics to a milestone")
		.action(async (options) => {
			try {
				await handleStatsCommand(options);
			} catch (err) {
				console.error("Failed to display statistics", err);
				process.exitCode = 1;
			}
		});
}
