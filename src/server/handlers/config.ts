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

	return {
		handleGetStatuses,
		handleGetConfig,
		handleUpdateConfig,
	};
}
