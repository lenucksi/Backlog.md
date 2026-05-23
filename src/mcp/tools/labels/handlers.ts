import type { McpServer } from "../../server.ts";
import type { CallToolResult } from "../../types.ts";

export interface LabelAddArgs {
	name: string;
}

export interface LabelRenameArgs {
	oldName: string;
	newName: string;
}

export interface LabelRemoveArgs {
	name: string;
}

export class LabelHandlers {
	constructor(private readonly core: McpServer) {}

	async listLabels(): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		const labels = config?.labels ?? [];
		return {
			content: [{ type: "text", text: JSON.stringify(labels) }],
		};
	}

	async addLabel(input: LabelAddArgs): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		if (!config) {
			return {
				content: [{ type: "text", text: "No backlog project found." }],
				isError: true,
			};
		}
		if ((config.labels ?? []).some((l) => l.toLowerCase() === input.name.toLowerCase())) {
			return {
				content: [{ type: "text", text: `Label already exists: ${input.name}` }],
				isError: true,
			};
		}
		config.labels = [...(config.labels ?? []), input.name].sort((a, b) => a.localeCompare(b));
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Added label: ${input.name}` }],
		};
	}

	async renameLabel(input: LabelRenameArgs): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		if (!config) {
			return {
				content: [{ type: "text", text: "No backlog project found." }],
				isError: true,
			};
		}
		const idx = (config.labels ?? []).findIndex((l) => l.toLowerCase() === input.oldName.toLowerCase());
		if (idx === -1) {
			return {
				content: [{ type: "text", text: `Label not found: ${input.oldName}` }],
				isError: true,
			};
		}
		if (
			(config.labels ?? []).some((l) => l.toLowerCase() === input.newName.toLowerCase() && l !== config.labels?.[idx])
		) {
			return {
				content: [{ type: "text", text: `Target label already exists: ${input.newName}` }],
				isError: true,
			};
		}
		config.labels[idx] = input.newName;
		config.labels = config.labels.sort((a, b) => a.localeCompare(b));
		await this.core.filesystem.saveConfig(config);

		const renameInEntity = (labels: string[] | undefined): string[] | undefined => {
			if (!labels) return undefined;
			const updated = labels.map((l) => (l.toLowerCase() === input.oldName.toLowerCase() ? input.newName : l));
			return updated.length > 0 ? updated : undefined;
		};

		const tasks = await this.core.filesystem.listTasks();
		for (const task of tasks) {
			const updatedLabels = renameInEntity(task.labels);
			if (updatedLabels) {
				await this.core.editTask(task.id, { labels: updatedLabels }, false);
			}
		}

		const docs = await this.core.filesystem.listDocs();
		for (const doc of docs) {
			const updatedLabels = renameInEntity(doc.labels);
			if (updatedLabels) {
				await this.core.editDoc(doc.id, { labels: updatedLabels });
			}
		}

		const decisions = await this.core.filesystem.listDecisions();
		for (const decision of decisions) {
			const updatedLabels = renameInEntity(decision.labels);
			if (updatedLabels) {
				await this.core.editDecision(decision.id, { labels: updatedLabels });
			}
		}

		return {
			content: [
				{ type: "text", text: `Renamed label "${input.oldName}" to "${input.newName}" in config and all entities.` },
			],
		};
	}

	async removeLabel(input: LabelRemoveArgs): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		if (!config) {
			return {
				content: [{ type: "text", text: "No backlog project found." }],
				isError: true,
			};
		}
		const idx = (config.labels ?? []).findIndex((l) => l.toLowerCase() === input.name.toLowerCase());
		if (idx === -1) {
			return {
				content: [{ type: "text", text: `Label not found: ${input.name}` }],
				isError: true,
			};
		}
		config.labels = config.labels.filter((_, i) => i !== idx);
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Removed label: ${input.name}` }],
		};
	}
}
