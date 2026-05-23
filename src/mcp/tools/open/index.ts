import type { BacklogConfig } from "../../../types/index.ts";
import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import { OpenHandlers, type OpenInBrowserArgs } from "./handlers.ts";
import { openInBrowserSchema } from "./schemas.ts";

export function registerOpenTools(server: McpServer, _config: BacklogConfig): void {
	const handlers = new OpenHandlers(server);

	const tool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "backlog_open_in_browser",
			description: "Open a backlog task, document, or decision in the browser",
			inputSchema: openInBrowserSchema,
			annotations: { title: "Open in Browser", readOnlyHint: true, destructiveHint: false },
		},
		openInBrowserSchema,
		async (input) => handlers.openInBrowser(input as OpenInBrowserArgs),
	);

	server.addTool(tool);
}
