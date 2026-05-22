import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import type { DecisionListArgs, DecisionSupersedeArgs, DecisionViewArgs } from "./handlers.ts";
import { DecisionHandlers } from "./handlers.ts";
import { decisionListSchema, decisionSupersedeSchema, decisionViewSchema } from "./schemas.ts";

export function registerDecisionTools(server: McpServer): void {
	const handlers = new DecisionHandlers(server);

	const listTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "decision_list",
			description: "List Backlog.md decisions with optional filtering by status, supersedes, or superseded-by",
			inputSchema: decisionListSchema,
			annotations: { title: "List Decisions", readOnlyHint: true, destructiveHint: false },
		},
		decisionListSchema,
		async (input) => handlers.listDecisions(input as DecisionListArgs),
	);

	const viewTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "decision_view",
			description:
				"View a Backlog.md decision including metadata, context, decision, consequences, and supersede links",
			inputSchema: decisionViewSchema,
			annotations: { title: "View Decision", readOnlyHint: true, destructiveHint: false },
		},
		decisionViewSchema,
		async (input) => handlers.viewDecision(input as DecisionViewArgs),
	);

	const supersedeTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "decision_supersede",
			description:
				"Supersede an existing decision with a new one. Marks the old decision as superseded and sets supersededBy, creates a new accepted decision with supersedes pointing to the old one.",
			inputSchema: decisionSupersedeSchema,
			annotations: { title: "Supersede Decision", destructiveHint: true },
		},
		decisionSupersedeSchema,
		async (input) => handlers.supersedeDecision(input as DecisionSupersedeArgs),
	);

	server.addTool(listTool);
	server.addTool(viewTool);
	server.addTool(supersedeTool);
}
