import type { ServerHandlerContext } from "../types.ts";

export function createConfigHandlers(ctx: ServerHandlerContext) {
	async function handleGetStatuses(): Promise<Response> {
		const config = await ctx.core.filesystem.loadConfig();
		const statuses = config?.statuses || ["To Do", "In Progress", "Done"];
		return Response.json(statuses);
	}

	async function handleGetConfig(): Promise<Response> {
		try {
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			return Response.json(config);
		} catch (error) {
			console.error("Error loading config:", error instanceof Error ? error.message : String(error));
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

			ctx.broadcastConfigUpdated();

			return Response.json(updatedConfig);
		} catch (error) {
			console.error("Error updating config:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to update configuration" }, { status: 500 });
		}
	}

	async function handleListLabels(): Promise<Response> {
		try {
			const config = await ctx.core.filesystem.loadConfig();
			const labels = config?.labels ?? [];
			const resolved = labels.map((label) => {
				if (typeof label === "string") {
					return { name: label };
				}
				return { name: label.name, ...(label.color ? { color: label.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error listing labels:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to list labels" }, { status: 500 });
		}
	}

	async function handleAddLabel(req: Request): Promise<Response> {
		try {
			const { name, color } = await req.json();
			if (!name || typeof name !== "string" || !name.trim()) {
				return Response.json({ error: "Label name is required" }, { status: 400 });
			}
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const trimmedName = name.trim();
			if (
				(config.labels ?? []).some(
					(l) => (typeof l === "string" ? l : l.name).toLowerCase() === trimmedName.toLowerCase(),
				)
			) {
				return Response.json({ error: `Label already exists: ${trimmedName}` }, { status: 409 });
			}
			const newLabel = color ? { name: trimmedName, color } : trimmedName;
			config.labels = [...(config.labels ?? []), newLabel].sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await ctx.core.filesystem.saveConfig(config);
			const resolved = config.labels.map((label) => {
				if (typeof label === "string") return { name: label };
				return { name: label.name, ...(label.color ? { color: label.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error adding label:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to add label" }, { status: 500 });
		}
	}

	async function handleRenameLabel(req: Request & { params: { name: string } }): Promise<Response> {
		try {
			const oldName = req.params.name;
			const body = await req.json();
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const labels = config.labels ?? [];
			const existing = labels.find((l) => (typeof l === "string" ? l : l.name).toLowerCase() === oldName.toLowerCase());
			if (!existing) {
				return Response.json({ error: `Label not found: ${oldName}` }, { status: 404 });
			}

			// Set-color-only operation
			if (body.color && !body.name) {
				const existingName = typeof existing === "string" ? existing : existing.name;
				config.labels = config.labels.map((l) => {
					const match = (typeof l === "string" ? l : l.name).toLowerCase() === oldName.toLowerCase();
					return match ? { name: existingName, color: body.color } : l;
				});
				await ctx.core.filesystem.saveConfig(config);
				const resolved = config.labels.map((label) => {
					if (typeof label === "string") return { name: label };
					return { name: label.name, ...(label.color ? { color: label.color } : {}) };
				});
				return Response.json(resolved);
			}

			// Rename operation
			const { name: newName, color } = body;
			if (!newName || typeof newName !== "string" || !newName.trim()) {
				return Response.json({ error: "New label name is required" }, { status: 400 });
			}
			const trimmedNew = newName.trim();
			if (
				labels.some(
					(l) => (typeof l === "string" ? l : l.name).toLowerCase() === trimmedNew.toLowerCase() && l !== existing,
				)
			) {
				return Response.json({ error: `Target label already exists: ${trimmedNew}` }, { status: 409 });
			}

			const existingColor = typeof existing === "string" ? undefined : existing.color;
			const effectiveColor = color ?? existingColor;
			config.labels = config.labels.map((l) => {
				const match = (typeof l === "string" ? l : l.name).toLowerCase() === oldName.toLowerCase();
				if (!match) return l;
				return effectiveColor ? { name: trimmedNew, color: effectiveColor } : trimmedNew;
			});
			config.labels = config.labels.sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
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

			const docs = await ctx.core.filesystem.listDocuments();
			for (const doc of docs) {
				const updatedLabels = renameInEntity(doc.labels);
				if (updatedLabels) {
					await ctx.core.updateDocumentFromInput({
						id: doc.id,
						labels: updatedLabels,
						content: doc.rawContent,
					});
				}
			}

			const decisions = await ctx.core.filesystem.listDecisions();
			for (const decision of decisions) {
				const updatedLabels = renameInEntity(decision.labels);
				if (updatedLabels) {
					await ctx.core.editDecision(decision.id, { labels: updatedLabels });
				}
			}

			const resolved = config.labels.map((label) => {
				if (typeof label === "string") return { name: label };
				return { name: label.name, ...(label.color ? { color: label.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error renaming label:", error instanceof Error ? error.message : String(error));
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
			const idx = (config.labels ?? []).findIndex(
				(l) => (typeof l === "string" ? l : l.name).toLowerCase() === labelName.toLowerCase(),
			);
			if (idx === -1) {
				return Response.json({ error: `Label not found: ${labelName}` }, { status: 404 });
			}
			config.labels = config.labels.filter((_, i) => i !== idx);
			await ctx.core.filesystem.saveConfig(config);
			const resolved = config.labels.map((label) => {
				if (typeof label === "string") return { name: label };
				return { name: label.name, ...(label.color ? { color: label.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error removing label:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to remove label" }, { status: 500 });
		}
	}

	async function handleListAuthors(): Promise<Response> {
		try {
			const config = await ctx.core.filesystem.loadConfig();
			const authors = config?.authors ?? [];
			const resolved = authors.map((author) => {
				if (typeof author === "string") {
					return { name: author };
				}
				return { name: author.name, ...(author.color ? { color: author.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error listing authors:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to list authors" }, { status: 500 });
		}
	}

	async function handleAddAuthor(req: Request): Promise<Response> {
		try {
			const { name, color } = await req.json();
			if (!name || typeof name !== "string" || !name.trim()) {
				return Response.json({ error: "Author name is required" }, { status: 400 });
			}
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const trimmedName = name.trim();
			if (
				(config.authors ?? []).some(
					(a) => (typeof a === "string" ? a : a.name).toLowerCase() === trimmedName.toLowerCase(),
				)
			) {
				return Response.json({ error: `Author already exists: ${trimmedName}` }, { status: 409 });
			}
			const newAuthor = color ? { name: trimmedName, color } : trimmedName;
			config.authors = [...(config.authors ?? []), newAuthor].sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await ctx.core.filesystem.saveConfig(config);
			const resolved = (config.authors ?? []).map((author) => {
				if (typeof author === "string") return { name: author };
				return { name: author.name, ...(author.color ? { color: author.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error adding author:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to add author" }, { status: 500 });
		}
	}

	async function handleRenameAuthor(req: Request & { params: { name: string } }): Promise<Response> {
		try {
			const oldName = req.params.name;
			const body = await req.json();
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const authors = config.authors ?? [];
			const existing = authors.find(
				(a) => (typeof a === "string" ? a : a.name).toLowerCase() === oldName.toLowerCase(),
			);
			if (!existing) {
				return Response.json({ error: `Author not found: ${oldName}` }, { status: 404 });
			}

			// Set-color-only operation
			if (body.color && !body.name) {
				const existingName = typeof existing === "string" ? existing : existing.name;
				config.authors = config.authors?.map((a) => {
					const match = (typeof a === "string" ? a : a.name).toLowerCase() === oldName.toLowerCase();
					return match ? { name: existingName, color: body.color } : a;
				});
				await ctx.core.filesystem.saveConfig(config);
				const resolved = (config.authors ?? []).map((author) => {
					if (typeof author === "string") return { name: author };
					return { name: author.name, ...(author.color ? { color: author.color } : {}) };
				});
				return Response.json(resolved);
			}

			// Rename operation
			const { name: newName, color } = body;
			if (!newName || typeof newName !== "string" || !newName.trim()) {
				return Response.json({ error: "New author name is required" }, { status: 400 });
			}
			const trimmedNew = newName.trim();
			if (
				authors.some(
					(a) => (typeof a === "string" ? a : a.name).toLowerCase() === trimmedNew.toLowerCase() && a !== existing,
				)
			) {
				return Response.json({ error: `Target author already exists: ${trimmedNew}` }, { status: 409 });
			}

			const existingColor = typeof existing === "string" ? undefined : existing.color;
			const effectiveColor = color ?? existingColor;
			config.authors = config.authors?.map((a) => {
				const match = (typeof a === "string" ? a : a.name).toLowerCase() === oldName.toLowerCase();
				if (!match) return a;
				return effectiveColor ? { name: trimmedNew, color: effectiveColor } : trimmedNew;
			});
			config.authors = config.authors?.sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await ctx.core.filesystem.saveConfig(config);

			const renameInEntity = (assignees: string[] | undefined): string[] | undefined => {
				if (!assignees) return undefined;
				const updated = assignees.map((a) => (a.toLowerCase() === oldName.toLowerCase() ? trimmedNew : a));
				return updated.length > 0 ? updated : undefined;
			};

			const tasks = await ctx.core.filesystem.listTasks();
			for (const task of tasks) {
				const updatedAssignees = renameInEntity(task.assignee);
				if (updatedAssignees) {
					await ctx.core.editTask(task.id, { assignee: updatedAssignees }, false);
				}
			}

			const resolved = (config.authors ?? []).map((author) => {
				if (typeof author === "string") return { name: author };
				return { name: author.name, ...(author.color ? { color: author.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error renaming author:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to rename author" }, { status: 500 });
		}
	}

	async function handleRemoveAuthor(req: Request & { params: { name: string } }): Promise<Response> {
		try {
			const authorName = req.params.name;
			const config = await ctx.core.filesystem.loadConfig();
			if (!config) {
				return Response.json({ error: "Configuration not found" }, { status: 404 });
			}
			const idx = (config.authors ?? []).findIndex(
				(a) => (typeof a === "string" ? a : a.name).toLowerCase() === authorName.toLowerCase(),
			);
			if (idx === -1) {
				return Response.json({ error: `Author not found: ${authorName}` }, { status: 404 });
			}
			config.authors = config.authors?.filter((_, i) => i !== idx);
			await ctx.core.filesystem.saveConfig(config);
			const resolved = (config.authors ?? []).map((author) => {
				if (typeof author === "string") return { name: author };
				return { name: author.name, ...(author.color ? { color: author.color } : {}) };
			});
			return Response.json(resolved);
		} catch (error) {
			console.error("Error removing author:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to remove author" }, { status: 500 });
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
		handleListAuthors,
		handleAddAuthor,
		handleRenameAuthor,
		handleRemoveAuthor,
	};
}
