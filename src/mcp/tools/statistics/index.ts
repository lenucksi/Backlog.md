import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import type { StatisticsArgs } from "./handlers.ts";
import { StatisticsHandlers } from "./handlers.ts";
import { statisticsSchema } from "./schemas.ts";

export function registerStatisticsTools(server: McpServer): void {
	const handlers = new StatisticsHandlers(server);

	const statsTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "backlog_get_statistics",
			description:
				"Get backlog statistics including task counts, completion percentage, status and priority breakdowns, and project health metrics. Optionally scope to a milestone.",
			inputSchema: statisticsSchema,
			annotations: { title: "Get Statistics", readOnlyHint: true, destructiveHint: false },
		},
		statisticsSchema,
		async (input) => handlers.getStatistics(input as StatisticsArgs),
	);

	server.addTool(statsTool);
}
