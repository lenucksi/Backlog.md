import type { Core } from "../../../core/backlog.ts";
import { getTaskStatistics } from "../../../core/statistics.ts";
import type { CallToolResult } from "../../types.ts";

export type StatisticsArgs = {
	milestone?: string;
};

export class StatisticsHandlers {
	constructor(private readonly core: Core) {}

	async getStatistics(args: StatisticsArgs = {}): Promise<CallToolResult> {
		await this.core.ensureConfigLoaded();
		const { tasks, drafts, statuses, terminalStatuses } = await this.core.loadAllTasksForStatistics();
		const archivedTasks = await this.core.fs.listArchivedTasks();

		const filteredTasks = args.milestone
			? tasks.filter((t) => {
					if (!t.milestone) return false;
					return t.milestone.toLowerCase() === args.milestone!.toLowerCase();
				})
			: tasks;

		const stats = getTaskStatistics(filteredTasks, drafts, statuses, terminalStatuses, archivedTasks);

		const data = {
			totalTasks: stats.totalTasks,
			completedTasks: stats.completedTasks,
			completionPercentage: stats.completionPercentage,
			draftCount: stats.draftCount,
			archivedTaskCount: stats.archivedCount,
			statusCounts: Object.fromEntries(stats.statusCounts),
			priorityCounts: Object.fromEntries(stats.priorityCounts),
			averageTaskAge: stats.projectHealth.averageTaskAge,
			staleTaskCount: stats.projectHealth.staleTasks.length,
			blockedTaskCount: stats.projectHealth.blockedTasks.length,
		};

		return {
			content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
		};
	}
}
