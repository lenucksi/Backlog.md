import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import type { LabelAddArgs, LabelRemoveArgs, LabelRenameArgs } from "./handlers.ts";
import { LabelHandlers } from "./handlers.ts";
import { labelAddSchema, labelListSchema, labelRemoveSchema, labelRenameSchema } from "./schemas.ts";

export function registerLabelTools(server: McpServer): void {
	const handlers = new LabelHandlers(server);

	const listTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "backlog_label_list",
			description: "List all labels from config.yml",
			inputSchema: labelListSchema,
			annotations: { title: "List Labels", readOnlyHint: true, destructiveHint: false },
		},
		labelListSchema,
		async () => handlers.listLabels(),
	);

	const addTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "backlog_label_add",
			description: "Add a new label to config.yml",
			inputSchema: labelAddSchema,
			annotations: { title: "Add Label", destructiveHint: false },
		},
		labelAddSchema,
		async (input) => handlers.addLabel(input as LabelAddArgs),
	);

	const renameTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "backlog_label_rename",
			description: "Rename a label in config.yml and update all task/doc/decision frontmatter",
			inputSchema: labelRenameSchema,
			annotations: { title: "Rename Label", destructiveHint: false },
		},
		labelRenameSchema,
		async (input) => handlers.renameLabel(input as LabelRenameArgs),
	);

	const removeTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "backlog_label_remove",
			description: "Remove a label from config.yml (does NOT remove from existing tasks/docs/decisions)",
			inputSchema: labelRemoveSchema,
			annotations: { title: "Remove Label", destructiveHint: true },
		},
		labelRemoveSchema,
		async (input) => handlers.removeLabel(input as LabelRemoveArgs),
	);

	server.addTool(listTool);
	server.addTool(addTool);
	server.addTool(renameTool);
	server.addTool(removeTool);
}

export type { LabelAddArgs, LabelRemoveArgs, LabelRenameArgs } from "./handlers.ts";
export {
	labelAddSchema,
	labelListSchema,
	labelRemoveSchema,
	labelRenameSchema,
} from "./schemas.ts";
