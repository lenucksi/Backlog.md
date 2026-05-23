import type { ServerHandlerContext } from "../types.ts";

export function createConfigHandlers(ctx: ServerHandlerContext) {
	async function handleGetStatuses(): Promise<Response> {
		const config = await ctx.core.filesystem.loadConfig();
		const statuses = config?.statuses || ["To Do", "In Progress", "Done"];
		return Response.json(statuses);
	}

	async function ensureLabelsMigrated(
		core: import("../types.ts").ServerHandlerContext["core"],
	): Promise<import("../../types/index.ts").BacklogConfig> {
		const config = await core.filesystem.loadConfig();
		if (!config) throw new Error("Configuration not found");
		if (config.labels && config.labels.length > 0) return config;

		const knownLabels = new Set<string>();
		const tasks = await core.filesystem.listTasks();
		for (const task of tasks) {
			for (const label of task.labels ?? []) {
				if (label) knownLabels.add(label);
			}
		}

		const docs = await core.filesystem.listDocs();
		for (const doc of docs) {
			for (const label of doc.labels ?? []) {
				if (label) knownLabels.add(label);
			}
		}

		const decisions = await core.filesystem.listDecisions();
		for (const decision of decisions) {
			for (const label of decision.labels ?? []) {
				if (label) knownLabels.add(label);
			}
		}

		if (knownLabels.size > 0) {
			config.labels = Array.from(knownLabels).sort((a, b) => a.localeCompare(b));
			await core.filesystem.saveConfig(config);
		}
		return config;
	}

	async function handleGetConfig(): Promise<Response> {
		try {
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			return Response.json(config);
		} catch (error) {
			console.error("Error loading config:", error);
			return Response.json({ error: "Failed to load configuration" }, { status: 500 });
		}
	}

	async function handleUpdateConfig(req: Request): Promise<Response> {
		try {
			const updatedConfig = await req.json();

			if (!updatedConfig.projectName?.trim()) {
				return Response.json({ error: "Project name is required" }, { status: 400 });
			}

			if (updatedConfig.defaultPort && (updatedConfig.defaultPort < 1 || updatedConfig.defaultPort > 65535)) {
				return Response.json({ error: "Port must be between 1 and 65535" }, { status: 400 });
			}

			await ctx.core.filesystem.saveConfig(updatedConfig);

			if (updatedConfig.projectName !== ctx.projectName) {
				ctx.setProjectName(updatedConfig.projectName);
			}

			ctx.broadcastTasksUpdated();

			return Response.json(updatedConfig);
		} catch (error) {
			console.error("Error updating config:", error);
			return Response.json({ error: "Failed to update configuration" }, { status: 500 });
		}
	}

	async function handleListLabels(): Promise<Response> {
		try {
			let config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json([]);
			}
			if (!config.labels || config.labels.length === 0) {
				config = await ensureLabelsMigrated(ctx.core);
			}
			return Response.json(config?.labels ?? []);
		} catch (error) {
			console.error("Error listing labels:", error);
			return Response.json({ error: "Failed to list labels" }, { status: 500 });
		}
	}

	async function handleAddLabel(req: Request): Promise<Response> {
		try {
			const { name } = await req.json();
			if (!name || typeof name !== "string" || !name.trim()) {
				return Response.json({ error: "Label name is required" }, { status: 400 });
			}
			let config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			if (!config.labels || config.labels.length === 0) {
				config = await ensureLabelsMigrated(ctx.core);
			}
			const trimmedName = name.trim();
			if ((config.labels ?? []).some((l) => l.toLowerCase() === trimmedName.toLowerCase())) {
				return Response.json({ error: `Label already exists: ${trimmedName}` }, { status: 409 });
			}
			config.labels = [...(config.labels ?? []), trimmedName].sort((a, b) => a.localeCompare(b));
			await ctx.core.filesystem.saveConfig(config);
			return Response.json(config.labels);
		} catch (error) {
			console.error("Error adding label:", error);
			return Response.json({ error: "Failed to add label" }, { status: 500 });
		}
	}

	async function handleRenameLabel(req: Request & { params: { name: string } }): Promise<Response> {
		try {
			const oldName = req.params.name;
			const { name: newName } = await req.json();
			if (!newName || typeof newName !== "string" || !newName.trim()) {
				return Response.json({ error: "New label name is required" }, { status: 400 });
			}
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const idx = (config.labels ?? []).findIndex((l) => l.toLowerCase() === oldName.toLowerCase());
			if (idx === -1) {
				return Response.json({ error: `Label not found: ${oldName}` }, { status: 404 });
			}
			const trimmedNew = newName.trim();
			if (
				(config.labels ?? []).some((l) => l.toLowerCase() === trimmedNew.toLowerCase() && l !== config.labels![idx])
			) {
				return Response.json({ error: `Target label already exists: ${trimmedNew}` }, { status: 409 });
			}
			config.labels[idx] = trimmedNew;
			config.labels = config.labels.sort((a, b) => a.localeCompare(b));
			await ctx.core.filesystem.saveConfig(config);

			const renameInEntity = (labels: string[] | undefined): string[] | undefined => {
				if (!labels) return undefined;
				const updated = labels.map((l) => (l.toLowerCase() === oldName.toLowerCase() ? trimmedNew : l));
				return updated.length > 0 ? updated : undefined;
			};

			const tasks = await ctx.core.filesystem.listTasks();
			for (const task of tasks) {
				const updatedLabels = renameInEntity(task.labels);
				if (updatedLabels) {
					await ctx.core.editTask(task.id, { labels: updatedLabels }, false);
				}
			}

			const docs = await ctx.core.filesystem.listDocs();
			for (const doc of docs) {
				const updatedLabels = renameInEntity(doc.labels);
				if (updatedLabels) {
					await ctx.core.editDoc(doc.id, { labels: updatedLabels });
				}
			}

			const decisions = await ctx.core.filesystem.listDecisions();
			for (const decision of decisions) {
				const updatedLabels = renameInEntity(decision.labels);
				if (updatedLabels) {
					await ctx.core.editDecision(decision.id, { labels: updatedLabels });
				}
			}

			return Response.json(config.labels);
		} catch (error) {
			console.error("Error renaming label:", error);
			return Response.json({ error: "Failed to rename label" }, { status: 500 });
		}
	}

	async function handleRemoveLabel(req: Request & { params: { name: string } }): Promise<Response> {
		try {
			const labelName = req.params.name;
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const idx = (config.labels ?? []).findIndex((l) => l.toLowerCase() === labelName.toLowerCase());
			if (idx === -1) {
				return Response.json({ error: `Label not found: ${labelName}` }, { status: 404 });
			}
			config.labels = config.labels.filter((_, i) => i !== idx);
			await ctx.core.filesystem.saveConfig(config);
			return Response.json(config.labels);
		} catch (error) {
			console.error("Error removing label:", error);
			return Response.json({ error: "Failed to remove label" }, { status: 500 });
		}
	}

	return {
		handleGetStatuses,
		handleGetConfig,
		handleUpdateConfig,
		handleListLabels,
		handleAddLabel,
		handleRenameLabel,
		handleRemoveLabel,
	};
}
