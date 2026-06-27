import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import type { LabelAddArgs, LabelRemoveArgs, LabelRemoveColorArgs, LabelRenameArgs, LabelSetColorArgs } from "./handlers.ts";
import { LabelHandlers } from "./handlers.ts";
import { labelAddSchema, labelListSchema, labelRemoveColorSchema, labelRemoveSchema, labelRenameSchema, labelSetColorSchema } from "./schemas.ts";

export function registerLabelTools(server: McpServer): void {
	const handlers = new LabelHandlers(server);

	const listTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "label_list",
			description: "List all labels from config.yml",
			inputSchema: labelListSchema,
			annotations: { title: "List Labels", readOnlyHint: true, destructiveHint: false },
		},
		labelListSchema,
		async () => handlers.listLabels(),
	);

	const addTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "label_add",
			description: "Add a new label to config.yml",
			inputSchema: labelAddSchema,
			annotations: { title: "Add Label", destructiveHint: false },
		},
		labelAddSchema,
		async (input) => handlers.addLabel(input as unknown as LabelAddArgs),
	);

	const renameTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "label_rename",
			description: "Rename a label in config.yml and update all task/doc/decision frontmatter",
			inputSchema: labelRenameSchema,
			annotations: { title: "Rename Label", destructiveHint: false },
		},
		labelRenameSchema,
		async (input) => handlers.renameLabel(input as unknown as LabelRenameArgs),
	);

	const setColorTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "label_set_color",
			description: "Set or change the color of a label",
			inputSchema: labelSetColorSchema,
			annotations: { title: "Set Label Color", destructiveHint: false },
		},
		labelSetColorSchema,
		async (input) => handlers.setLabelColor(input as unknown as LabelSetColorArgs),
	);

	const removeColorTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "label_remove_color",
			description: "Remove color from a label (reverts to plain string)",
			inputSchema: labelRemoveColorSchema,
			annotations: { title: "Remove Label Color", destructiveHint: false },
		},
		labelRemoveColorSchema,
		async (input) => handlers.removeLabelColor(input as unknown as LabelRemoveColorArgs),
	);

	const removeTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "label_remove",
			description: "Remove a label from config.yml (does NOT remove from existing tasks/docs/decisions)",
			inputSchema: labelRemoveSchema,
			annotations: { title: "Remove Label", destructiveHint: true },
		},
		labelRemoveSchema,
		async (input) => handlers.removeLabel(input as unknown as LabelRemoveArgs),
	);

	server.addTool(listTool);
	server.addTool(addTool);
	server.addTool(renameTool);
	server.addTool(setColorTool);
	server.addTool(removeColorTool);
	server.addTool(removeTool);
}

export type { LabelAddArgs, LabelRemoveArgs, LabelRemoveColorArgs, LabelRenameArgs, LabelSetColorArgs } from "./handlers.ts";
export {
	labelAddSchema,
	labelListSchema,
	labelRemoveColorSchema,
	labelRemoveSchema,
	labelRenameSchema,
	labelSetColorSchema,
} from "./schemas.ts";
