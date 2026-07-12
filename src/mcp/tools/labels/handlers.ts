import type { BacklogConfig } from "../../../types/index.ts";
import type { McpServer } from "../../server.ts";
import type { CallToolResult } from "../../types.ts";

export interface LabelAddArgs {
	name: string;
	color?: string;
}

export interface LabelRenameArgs {
	oldName: string;
	newName: string;
}

export interface LabelSetColorArgs {
	name: string;
	color: string;
}

export interface LabelRemoveColorArgs {
	name: string;
}

export interface LabelRemoveArgs {
	name: string;
}

export class LabelHandlers {
	constructor(private readonly core: McpServer) {}

	private async loadConfig(): Promise<
		{ ok: true; config: BacklogConfig } | { ok: false; error: CallToolResult }
	> {
		const result = await this.core.filesystem.loadConfig();
		if (!result) {
			return {
				ok: false,
				error: {
					content: [{ type: "text", text: "No backlog project found." }],
					isError: true,
				},
			};
		}
		return { ok: true, config: result };
	}

	private requireLabel(config: BacklogConfig, name: string): number | CallToolResult {
		const idx = (config.labels ?? []).findIndex(
			(l) => (typeof l === "string" ? l : l.name).toLowerCase() === name.toLowerCase(),
		);
		if (idx === -1) {
			return {
				content: [{ type: "text", text: `Label not found: ${name}` }],
				isError: true,
			};
		}
		return idx;
	}

	async listLabels(): Promise<CallToolResult> {
		const config = await this.core.filesystem.loadConfig();
		const labels = config?.labels ?? [];
		return {
			content: [{ type: "text", text: JSON.stringify(labels) }],
		};
	}

	async addLabel(input: LabelAddArgs): Promise<CallToolResult> {
		const result = await this.loadConfig();
		if (!result.ok) return result.error;
		const { config } = result;
		if ((config.labels ?? []).some((l) => (typeof l === "string" ? l : l.name).toLowerCase() === input.name.toLowerCase())) {
			return {
				content: [{ type: "text", text: `Label already exists: ${input.name}` }],
				isError: true,
			};
		}
		const newLabel = input.color ? { name: input.name, color: input.color } : input.name;
		config.labels = [...(config.labels ?? []), newLabel].sort((a, b) => (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name));
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Added label: ${input.name}` }],
		};
	}

	async renameLabel(input: LabelRenameArgs): Promise<CallToolResult> {
		const result = await this.loadConfig();
		if (!result.ok) return result.error;
		const { config } = result;
		const idx = this.requireLabel(config, input.oldName);
		if (typeof idx !== "number") return idx;
		if (
			(config.labels ?? []).some((l) => (typeof l === "string" ? l : l.name).toLowerCase() === input.newName.toLowerCase() && l !== config.labels?.[idx])
		) {
			return {
				content: [{ type: "text", text: `Target label already exists: ${input.newName}` }],
				isError: true,
			};
		}
		const existingLabel = config.labels[idx];
		config.labels[idx] = typeof existingLabel === "object" && existingLabel.color
			? { name: input.newName, color: existingLabel.color }
			: input.newName;
		config.labels = config.labels.sort((a, b) => (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name));
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

		const docs = await this.core.filesystem.listDocuments();
		for (const doc of docs) {
			const updatedLabels = renameInEntity(doc.labels);
			if (updatedLabels) {
				const currentDoc = await this.core.filesystem.loadDocument(doc.id);
				await this.core.updateDocumentFromInput({
					id: doc.id,
					labels: updatedLabels,
					content: currentDoc?.rawContent ?? "",
				});
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

	async setLabelColor(input: LabelSetColorArgs): Promise<CallToolResult> {
		const result = await this.loadConfig();
		if (!result.ok) return result.error;
		const { config } = result;
		const idx = this.requireLabel(config, input.name);
		if (typeof idx !== "number") return idx;
		const existing = config.labels[idx];
		if (!existing) return { content: [{ type: "text", text: `Label not found: ${input.name}` }], isError: true };
		config.labels[idx] = { name: typeof existing === "string" ? existing : existing.name, color: input.color };
		config.labels = config.labels.sort((a, b) => (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name));
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Set color for label "${input.name}" to ${input.color}` }],
		};
	}

	async removeLabelColor(input: LabelRemoveColorArgs): Promise<CallToolResult> {
		const result = await this.loadConfig();
		if (!result.ok) return result.error;
		const { config } = result;
		const idx = this.requireLabel(config, input.name);
		if (typeof idx !== "number") return idx;
		const existing = config.labels[idx];
		if (!existing) return { content: [{ type: "text", text: `Label not found: ${input.name}` }], isError: true };
		if (typeof existing === "string" || !existing.color) {
			return {
				content: [{ type: "text", text: `Label "${input.name}" has no color to remove.` }],
			};
		}
		config.labels[idx] = existing.name;
		config.labels = config.labels.sort((a, b) => (typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name));
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Removed color from label "${input.name}"` }],
		};
	}

	async removeLabel(input: LabelRemoveArgs): Promise<CallToolResult> {
		const result = await this.loadConfig();
		if (!result.ok) return result.error;
		const { config } = result;
		const idx = this.requireLabel(config, input.name);
		if (typeof idx !== "number") return idx;
		config.labels = config.labels.filter((_, i) => i !== idx);
		await this.core.filesystem.saveConfig(config);
		return {
			content: [{ type: "text", text: `Removed label: ${input.name}` }],
		};
	}
}
