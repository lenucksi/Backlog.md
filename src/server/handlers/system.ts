import { dirname, join } from "node:path";
import { initializeProject } from "../../core/init.ts";
import { getTaskStatistics } from "../../core/statistics.ts";
import { scanForDuplicateIds } from "../../utils/duplicate-detection.ts";
import { getVersion } from "../../utils/version.ts";
import type { ServerHandlerContext } from "../types.ts";
import { parseOptionalBoolean } from "../utils.ts";

export function createSystemHandlers(ctx: ServerHandlerContext) {
	async function handleGetVersion(): Promise<Response> {
		try {
			const version = await getVersion();
			return Response.json({ version });
		} catch (error) {
			console.error("Error getting version:", error);
			return Response.json({ error: "Failed to get version" }, { status: 500 });
		}
	}

	async function handleGetStatistics(): Promise<Response> {
		try {
			const { tasks, drafts, statuses, terminalStatuses, blockedStatuses } = await ctx.core.loadAllTasksForStatistics();
			const archivedTasks = await ctx.core.filesystem.listArchivedTasks();

			const statistics = getTaskStatistics(tasks, drafts, statuses, terminalStatuses, archivedTasks, blockedStatuses);

			const response = {
				...statistics,
				statusCounts: Object.fromEntries(statistics.statusCounts),
				priorityCounts: Object.fromEntries(statistics.priorityCounts),
			};

			return Response.json(response);
		} catch (error) {
			console.error("Error getting statistics:", error);
			return Response.json({ error: "Failed to get statistics" }, { status: 500 });
		}
	}

	async function handleGetStatus(): Promise<Response> {
		try {
			const config = await ctx.core.filesystem.loadConfig();
			const backlogResolution = ctx.core.filesystem.resolveBacklogDirectoryInfo();
			return Response.json({
				initialized: !!config,
				projectPath: ctx.core.filesystem.rootDir,
				backlogDirectory: backlogResolution.backlogDir,
				backlogDirectorySource: backlogResolution.source,
				configLocation: backlogResolution.configSource,
				rootConfigPath: backlogResolution.rootConfigPath,
			});
		} catch (error) {
			console.error("Error getting status:", error);
			return Response.json({
				initialized: false,
				projectPath: ctx.core.filesystem.rootDir,
				backlogDirectory: null,
				backlogDirectorySource: null,
				configLocation: null,
				rootConfigPath: null,
			});
		}
	}

	async function handleInit(req: Request): Promise<Response> {
		try {
			const body = await req.json();
			const projectName = typeof body.projectName === "string" ? body.projectName.trim() : "";
			const backlogDirectory = typeof body.backlogDirectory === "string" ? body.backlogDirectory.trim() : undefined;
			const backlogDirectorySource =
				body.backlogDirectorySource === "backlog" ||
				body.backlogDirectorySource === ".backlog" ||
				body.backlogDirectorySource === "custom"
					? body.backlogDirectorySource
					: undefined;
			const configLocation =
				body.configLocation === "folder" || body.configLocation === "root" ? body.configLocation : undefined;
			const integrationMode = body.integrationMode as "mcp" | "cli" | "none" | undefined;
			const mcpClients = Array.isArray(body.mcpClients) ? body.mcpClients : [];
			const agentInstructions = Array.isArray(body.agentInstructions) ? body.agentInstructions : [];
			const installClaudeAgentFlag = parseOptionalBoolean(body.installClaudeAgent) ?? false;
			const filesystemOnly = parseOptionalBoolean(body.filesystemOnly) ?? false;
			const advancedConfig = body.advancedConfig || {};

			if (!projectName) {
				return Response.json({ error: "Project name is required" }, { status: 400 });
			}

			const existingConfig = await ctx.core.filesystem.loadConfig();
			if (existingConfig) {
				return Response.json({ error: "Project is already initialized" }, { status: 400 });
			}

			const result = await initializeProject(ctx.core, {
				projectName,
				backlogDirectory,
				backlogDirectorySource,
				configLocation,
				integrationMode: integrationMode || "none",
				mcpClients,
				agentInstructions,
				installClaudeAgent: installClaudeAgentFlag,
				filesystemOnly,
				advancedConfig,
				existingConfig: null,
			});

			ctx.setProjectName(result.projectName);

			ctx.ensureConfigWatcher();

			return Response.json({
				success: result.success,
				projectName: result.projectName,
				mcpResults: result.mcpResults,
			});
		} catch (error) {
			console.error("Error initializing project:", error);
			const message = error instanceof Error ? error.message : "Failed to initialize project";
			return Response.json({ error: message }, { status: 500 });
		}
	}

	async function handleGetDuplicates(): Promise<Response> {
		try {
			const tasks = await ctx.core.loadTasks();
			const duplicates = scanForDuplicateIds(tasks);
			return Response.json(duplicates);
		} catch (error) {
			console.error("Error getting duplicates:", error);
			return Response.json({ error: "Failed to get duplicates" }, { status: 500 });
		}
	}

	async function handleAssetRequest(req: Request): Promise<Response> {
		try {
			const url = new URL(req.url);
			const pathname = decodeURIComponent(url.pathname || "");
			const prefix = "/assets/";
			if (!pathname.startsWith(prefix)) return new Response("Not Found", { status: 404 });

			const relPath = pathname.slice(prefix.length);

			if (relPath.includes("..")) return new Response("Not Found", { status: 404 });

			const docsDir = ctx.core.filesystem.docsDir;
			const backlogRoot = dirname(docsDir);
			const assetsRoot = join(backlogRoot, "assets");
			const filePath = join(assetsRoot, relPath);

			if (!filePath.startsWith(assetsRoot)) return new Response("Not Found", { status: 404 });

			const file = Bun.file(filePath);
			if (!(await file.exists())) return new Response("Not Found", { status: 404 });

			const ext = (filePath.match(/\.([^./]+)$/) || [])[1]?.toLowerCase() || "";
			const mimeMap: Record<string, string> = {
				png: "image/png",
				jpg: "image/jpeg",
				jpeg: "image/jpeg",
				gif: "image/gif",
				svg: "image/svg+xml",
				webp: "image/webp",
				avif: "image/avif",
				pdf: "application/pdf",
				txt: "text/plain",
				css: "text/css",
				js: "application/javascript",
			};

			const mime = mimeMap[ext] ?? "application/octet-stream";
			return new Response(file, { headers: { "Content-Type": mime } });
		} catch (error) {
			console.error("Error serving asset:", error);
			return new Response("Internal Server Error", { status: 500 });
		}
	}

	return {
		handleGetVersion,
		handleGetStatistics,
		handleGetStatus,
		handleGetDuplicates,
		handleInit,
		handleAssetRequest,
	};
}
