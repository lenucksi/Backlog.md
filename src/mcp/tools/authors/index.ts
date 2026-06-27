import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import type { AuthorAddArgs, AuthorRemoveArgs, AuthorRenameArgs } from "./handlers.ts";
import { AuthorHandlers } from "./handlers.ts";
import { authorAddSchema, authorListSchema, authorRemoveSchema, authorRenameSchema } from "./schemas.ts";

export function registerAuthorTools(server: McpServer): void {
	const handlers = new AuthorHandlers(server);

	const listTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "author_list",
			description: "List all authors from config.yml",
			inputSchema: authorListSchema,
			annotations: { title: "List Authors", readOnlyHint: true, destructiveHint: false },
		},
		authorListSchema,
		async () => handlers.listAuthors(),
	);

	const addTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "author_add",
			description: "Add a new author to config.yml",
			inputSchema: authorAddSchema,
			annotations: { title: "Add Author", destructiveHint: false },
		},
		authorAddSchema,
		async (input) => handlers.addAuthor(input as unknown as AuthorAddArgs),
	);

	const renameTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "author_rename",
			description: "Rename an author in config.yml and update all task frontmatter",
			inputSchema: authorRenameSchema,
			annotations: { title: "Rename Author", destructiveHint: false },
		},
		authorRenameSchema,
		async (input) => handlers.renameAuthor(input as unknown as AuthorRenameArgs),
	);

	const removeTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "author_remove",
			description: "Remove an author from config.yml (does NOT remove from existing tasks)",
			inputSchema: authorRemoveSchema,
			annotations: { title: "Remove Author", destructiveHint: true },
		},
		authorRemoveSchema,
		async (input) => handlers.removeAuthor(input as unknown as AuthorRemoveArgs),
	);

	server.addTool(listTool);
	server.addTool(addTool);
	server.addTool(renameTool);
	server.addTool(removeTool);
}

export type { AuthorAddArgs, AuthorRemoveArgs, AuthorRenameArgs } from "./handlers.ts";
export {
	authorAddSchema,
	authorListSchema,
	authorRemoveSchema,
	authorRenameSchema,
} from "./schemas.ts";
