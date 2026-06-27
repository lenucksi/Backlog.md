import type { McpServer } from "../../server.ts";
import type { CallToolResult } from "../../types.ts";

export interface AuthorAddArgs {
	name: string;
	color?: string;
}

export interface AuthorRenameArgs {
	oldName: string;
	newName: string;
}

export interface AuthorRemoveArgs {
	name: string;
}

export class AuthorHandlers {
	constructor(private readonly core: McpServer) {}

	async listAuthors(): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		const authors = config?.authors ?? [];
		return {
			content: [{ type: "text", text: JSON.stringify(authors) }],
		};
	}

	async addAuthor(input: AuthorAddArgs): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		if (!config) {
			return {
				content: [{ type: "text", text: "No backlog project found." }],
				isError: true,
			};
		}
		if ((config.authors ?? []).some((a) => (typeof a === "string" ? a : a.name).toLowerCase() === input.name.toLowerCase())) {
			return {
				content: [{ type: "text", text: `Author already exists: ${input.name}` }],
				isError: true,
			};
		}
		const newAuthor = input.color ? { name: input.name, color: input.color } : input.name;
		config.authors = [...(config.authors ?? []), newAuthor].sort((a, b) => (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name));
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Added author: ${input.name}` }],
		};
	}

	async renameAuthor(input: AuthorRenameArgs): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		if (!config) {
			return {
				content: [{ type: "text", text: "No backlog project found." }],
				isError: true,
			};
		}
		const authors = config.authors ?? [];
		const idx = authors.findIndex((a) => (typeof a === "string" ? a : a.name).toLowerCase() === input.oldName.toLowerCase());
		if (idx === -1) {
			return {
				content: [{ type: "text", text: `Author not found: ${input.oldName}` }],
				isError: true,
			};
		}
		if (
			authors.some((a) => (typeof a === "string" ? a : a.name).toLowerCase() === input.newName.toLowerCase() && a !== authors[idx])
		) {
			return {
				content: [{ type: "text", text: `Target author already exists: ${input.newName}` }],
				isError: true,
			};
		}
		authors[idx] = input.newName;
		config.authors = authors.sort((a, b) => (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name));
		await this.core.filesystem.saveConfig(config);

		const renameInEntity = (assignees: string[] | undefined): string[] | undefined => {
			if (!assignees) return undefined;
			const updated = assignees.map((a) => (a.toLowerCase() === input.oldName.toLowerCase() ? input.newName : a));
			return updated.length > 0 ? updated : undefined;
		};

		const tasks = await this.core.filesystem.listTasks();
		for (const task of tasks) {
			const updatedAssignees = renameInEntity(task.assignee);
			if (updatedAssignees) {
				await this.core.editTask(task.id, { assignee: updatedAssignees }, false);
			}
		}

		return {
			content: [
				{ type: "text", text: `Renamed author "${input.oldName}" to "${input.newName}" in config and all entities.` },
			],
		};
	}

	async removeAuthor(input: AuthorRemoveArgs): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		if (!config) {
			return {
				content: [{ type: "text", text: "No backlog project found." }],
				isError: true,
			};
		}
		const idx = (config.authors ?? []).findIndex((a) => (typeof a === "string" ? a : a.name).toLowerCase() === input.name.toLowerCase());
		if (idx === -1) {
			return {
				content: [{ type: "text", text: `Author not found: ${input.name}` }],
				isError: true,
			};
		}
		config.authors = config.authors?.filter((_, i) => i !== idx);
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Removed author: ${input.name}` }],
		};
	}
}
