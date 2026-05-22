import { spawn } from "bun";
import {
	type AgentInstructionFile,
	addAgentInstructions,
	ensureMcpGuidelines,
	installClaudeAgent,
} from "../agent-instructions.ts";
import { DEFAULT_INIT_CONFIG } from "../constants/index.ts";
import type { BacklogConfig } from "../types/index.ts";
import { normalizeProjectBacklogDirectory } from "../utils/backlog-directory.ts";
import type { Core } from "./backlog.ts";

export const MCP_SERVER_NAME = "backlog";
export const MCP_GUIDE_URL = "https://github.com/MrLesk/Backlog.md#-mcp-integration-model-context-protocol";

export type IntegrationMode = "mcp" | "cli" | "none";
export type McpClient = "claude" | "codex" | "gemini" | "kiro" | "guide";

export interface InitializeProjectOptions {
	projectName: string;
	backlogDirectory?: string;
	backlogDirectorySource?: "backlog" | ".backlog" | "custom";
	configLocation?: "folder" | "root";
	integrationMode: IntegrationMode;
	mcpClients?: McpClient[];
	agentInstructions?: AgentInstructionFile[];
	installClaudeAgent?: boolean;
	filesystemOnly?: boolean;
	advancedConfig?: {
		checkActiveBranches?: boolean;
		remoteOperations?: boolean;
		activeBranchDays?: number;
		bypassGitHooks?: boolean;
		autoCommit?: boolean;
		zeroPaddedIds?: number;
		defaultEditor?: string;
		definitionOfDone?: string[];
		defaultPort?: number;
		autoOpenBrowser?: boolean;
		/** Custom task prefix (e.g., "JIRA"). Only set during first init, read-only after. */
		taskPrefix?: string;
	};
	/** Existing config for re-initialization */
	existingConfig?: BacklogConfig | null;
}

export interface InitializeProjectResult {
	success: boolean;
	projectName: string;
	isReInitialization: boolean;
	config: BacklogConfig;
	mcpResults?: Record<string, string>;
}

async function runMcpClientCommand(label: string, command: string, args: string[]): Promise<string> {
	try {
		const child = spawn({
			cmd: [command, ...args],
			stdout: "pipe",
			stderr: "pipe",
		});
		const exitCode = await child.exited;
		if (exitCode !== 0) {
			throw new Error(`Command exited with code ${exitCode}`);
		}
		return `Added Backlog MCP server to ${label}`;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Unable to configure ${label} automatically (${message}). Run manually: ${command} ${args.join(" ")}`,
		);
	}
}

const MCP_CLIENT_CONFIGS: Record<
	string,
	{ label: string; command: string; args: string[]; guidelinesFile: AgentInstructionFile } | { isGuide: true }
> = {
	claude: {
		label: "Claude Code",
		command: "claude",
		args: ["mcp", "add", "-s", "user", MCP_SERVER_NAME, "--", "backlog", "mcp", "start"],
		guidelinesFile: "CLAUDE.md",
	},
	codex: {
		label: "OpenAI Codex",
		command: "codex",
		args: ["mcp", "add", MCP_SERVER_NAME, "backlog", "mcp", "start"],
		guidelinesFile: "AGENTS.md",
	},
	gemini: {
		label: "Gemini CLI",
		command: "gemini",
		args: ["mcp", "add", "-s", "user", MCP_SERVER_NAME, "--", "backlog", "mcp", "start"],
		guidelinesFile: "GEMINI.md",
	},
	kiro: {
		label: "Kiro",
		command: "kiro-cli",
		args: ["mcp", "add", "--scope", "global", "--name", MCP_SERVER_NAME, "--command", "backlog", "--args", "mcp,start"],
		guidelinesFile: "AGENTS.md",
	},
	guide: { isGuide: true },
};

async function handleMcpClient(client: string, projectRoot: string): Promise<string> {
	const config = MCP_CLIENT_CONFIGS[client];
	if (!config) {
		throw new Error(`Unknown MCP client: ${client}`);
	}
	if ("isGuide" in config) {
		return `Setup guide: ${MCP_GUIDE_URL}`;
	}
	const result = await runMcpClientCommand(config.label, config.command, config.args);
	await ensureMcpGuidelines(projectRoot, config.guidelinesFile);
	return result;
}

async function setupMcpIntegration(mcpClients: McpClient[], projectRoot: string): Promise<Record<string, string>> {
	const results: Record<string, string> = {};
	for (const client of mcpClients) {
		try {
			results[client] = await handleMcpClient(client, projectRoot);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			results[client] = `Failed: ${message}`;
		}
	}
	return results;
}

function buildInitConfig(
	projectName: string,
	existingConfig: BacklogConfig | null | undefined,
	normalizedAdvancedConfig: Record<string, unknown>,
	effectiveFilesystemOnly: boolean,
): BacklogConfig {
	const hasDefaultEditorOverride = Object.hasOwn(normalizedAdvancedConfig, "defaultEditor");
	const hasZeroPaddedIdsOverride = Object.hasOwn(normalizedAdvancedConfig, "zeroPaddedIds");
	const hasDefinitionOfDoneOverride = Object.hasOwn(normalizedAdvancedConfig, "definitionOfDone");

	const d = DEFAULT_INIT_CONFIG;
	const baseConfig: BacklogConfig = {
		projectName,
		statuses: ["To Do", "In Progress", "Done"],
		labels: [],
		defaultStatus: "To Do",
		maxColumnWidth: 20,
		filesystemOnly: effectiveFilesystemOnly || d.filesystemOnly,
		autoCommit:
			(normalizedAdvancedConfig.autoCommit as boolean | undefined) ?? existingConfig?.autoCommit ?? d.autoCommit,
		remoteOperations:
			(normalizedAdvancedConfig.remoteOperations as boolean | undefined) ??
			existingConfig?.remoteOperations ??
			d.remoteOperations,
		bypassGitHooks:
			(normalizedAdvancedConfig.bypassGitHooks as boolean | undefined) ??
			existingConfig?.bypassGitHooks ??
			d.bypassGitHooks,
		checkActiveBranches:
			(normalizedAdvancedConfig.checkActiveBranches as boolean | undefined) ??
			existingConfig?.checkActiveBranches ??
			d.checkActiveBranches,
		activeBranchDays:
			(normalizedAdvancedConfig.activeBranchDays as number | undefined) ??
			existingConfig?.activeBranchDays ??
			d.activeBranchDays,
		defaultPort:
			(normalizedAdvancedConfig.defaultPort as number | undefined) ?? existingConfig?.defaultPort ?? d.defaultPort,
		autoOpenBrowser:
			(normalizedAdvancedConfig.autoOpenBrowser as boolean | undefined) ??
			existingConfig?.autoOpenBrowser ??
			d.autoOpenBrowser,
		taskResolutionStrategy: existingConfig?.taskResolutionStrategy || "most_recent",
		prefixes: existingConfig?.prefixes || {
			task: (normalizedAdvancedConfig.taskPrefix as string | undefined) || "task",
		},
	};

	const config: BacklogConfig = {
		...baseConfig,
		...(existingConfig ?? {}),
		projectName,
		filesystemOnly: effectiveFilesystemOnly || d.filesystemOnly,
		autoCommit:
			(normalizedAdvancedConfig.autoCommit as boolean | undefined) ?? existingConfig?.autoCommit ?? d.autoCommit,
		remoteOperations:
			(normalizedAdvancedConfig.remoteOperations as boolean | undefined) ??
			existingConfig?.remoteOperations ??
			d.remoteOperations,
		bypassGitHooks:
			(normalizedAdvancedConfig.bypassGitHooks as boolean | undefined) ??
			existingConfig?.bypassGitHooks ??
			d.bypassGitHooks,
		checkActiveBranches:
			(normalizedAdvancedConfig.checkActiveBranches as boolean | undefined) ??
			existingConfig?.checkActiveBranches ??
			d.checkActiveBranches,
		activeBranchDays:
			(normalizedAdvancedConfig.activeBranchDays as number | undefined) ??
			existingConfig?.activeBranchDays ??
			d.activeBranchDays,
		defaultPort:
			(normalizedAdvancedConfig.defaultPort as number | undefined) ?? existingConfig?.defaultPort ?? d.defaultPort,
		autoOpenBrowser:
			(normalizedAdvancedConfig.autoOpenBrowser as boolean | undefined) ??
			existingConfig?.autoOpenBrowser ??
			d.autoOpenBrowser,
		prefixes: existingConfig?.prefixes || {
			task: (normalizedAdvancedConfig.taskPrefix as string | undefined) || "task",
		},
		...(hasDefaultEditorOverride && normalizedAdvancedConfig.defaultEditor
			? { defaultEditor: normalizedAdvancedConfig.defaultEditor as string }
			: {}),
		...(hasZeroPaddedIdsOverride &&
		typeof normalizedAdvancedConfig.zeroPaddedIds === "number" &&
		normalizedAdvancedConfig.zeroPaddedIds > 0
			? { zeroPaddedIds: normalizedAdvancedConfig.zeroPaddedIds as number }
			: {}),
		...(hasDefinitionOfDoneOverride && Array.isArray(normalizedAdvancedConfig.definitionOfDone)
			? { definitionOfDone: [...(normalizedAdvancedConfig.definitionOfDone as string[])] }
			: {}),
	};

	if (hasDefaultEditorOverride && !normalizedAdvancedConfig.defaultEditor) {
		delete config.defaultEditor;
	}
	if (
		hasZeroPaddedIdsOverride &&
		!(
			typeof normalizedAdvancedConfig.zeroPaddedIds === "number" &&
			(normalizedAdvancedConfig.zeroPaddedIds as number) > 0
		)
	) {
		delete config.zeroPaddedIds;
	}
	if (hasDefinitionOfDoneOverride && !Array.isArray(normalizedAdvancedConfig.definitionOfDone)) {
		delete config.definitionOfDone;
	}

	return config;
}

function inferBacklogDirectorySource(
	directory: string | null | undefined,
): ".backlog" | "backlog" | "custom" | undefined {
	if (!directory) return undefined;
	if (directory === ".backlog") return ".backlog";
	if (directory === "backlog") return "backlog";
	return "custom";
}

function validateDirectoryCompatibility(source: string | undefined, inferred: string | undefined): void {
	if (source && inferred && source !== inferred) {
		throw new Error("Backlog directory source and backlog directory value must agree.");
	}
}

function validateDirectoryExists(source: string | undefined, directory: string | null | undefined): void {
	if (source === "custom" && !directory) {
		throw new Error("Backlog directory must be a valid project-relative path.");
	}
}

function validateCustomConfigLocation(source: string | undefined, configLocation: string | undefined): void {
	if (source === "custom" && configLocation !== "root") {
		throw new Error("Custom backlog directories require root config discovery.");
	}
}

function resolveConfigLocation(source: string | undefined, configOption: string | undefined): "folder" | "root" {
	return configOption ?? (source === "custom" ? "root" : "folder");
}

function resolveBacklogDirectory(directory: string | null | undefined, source: string | undefined): string {
	return directory ?? (source === ".backlog" ? ".backlog" : "backlog");
}

async function setupBacklogStructure(
	core: Core,
	options: InitializeProjectOptions,
	config: BacklogConfig,
	isReInitialization: boolean,
): Promise<void> {
	if (isReInitialization) {
		await core.filesystem.saveConfig(config);
		return;
	}

	const normalizedBacklogDirectory = normalizeProjectBacklogDirectory(options.backlogDirectory);
	const inferredSource = inferBacklogDirectorySource(normalizedBacklogDirectory);

	validateDirectoryCompatibility(options.backlogDirectorySource, inferredSource);

	const effectiveSource = options.backlogDirectorySource ?? inferredSource;

	validateDirectoryExists(effectiveSource, normalizedBacklogDirectory);

	const effectiveConfigLocation = resolveConfigLocation(effectiveSource, options.configLocation);

	validateCustomConfigLocation(effectiveSource, effectiveConfigLocation);

	const selectedBacklogDirectory = resolveBacklogDirectory(normalizedBacklogDirectory, effectiveSource);

	core.filesystem.setBacklogDirectory(selectedBacklogDirectory);
	core.filesystem.setConfigLocation(effectiveConfigLocation);
	await core.filesystem.ensureBacklogStructure();
	await core.filesystem.saveConfig(config);
	await core.ensureConfigLoaded();
}

/**
 * Core initialization logic shared between CLI and browser.
 * Both CLI and browser validate input before calling this function.
 */
export async function initializeProject(
	core: Core,
	options: InitializeProjectOptions,
): Promise<InitializeProjectResult> {
	const {
		projectName,
		integrationMode,
		mcpClients = [],
		agentInstructions = [],
		installClaudeAgent: installClaudeAgentFlag = false,
		advancedConfig = {},
		existingConfig,
		filesystemOnly = false,
	} = options;

	const isReInitialization = !!existingConfig;
	const projectRoot = core.filesystem.rootDir;
	const effectiveFilesystemOnly = filesystemOnly || existingConfig?.filesystemOnly === true;
	const normalizedAdvancedConfig = effectiveFilesystemOnly
		? {
				...advancedConfig,
				checkActiveBranches: false,
				remoteOperations: false,
				bypassGitHooks: false,
				autoCommit: false,
			}
		: advancedConfig;

	const config = buildInitConfig(projectName, existingConfig, normalizedAdvancedConfig, effectiveFilesystemOnly);
	await setupBacklogStructure(core, options, config, isReInitialization);

	const mcpResults: Record<string, string> = {};

	if (integrationMode === "mcp" && mcpClients.length > 0) {
		Object.assign(mcpResults, await setupMcpIntegration(mcpClients, projectRoot));
	}

	if (integrationMode === "cli" && agentInstructions.length > 0) {
		try {
			await addAgentInstructions(projectRoot, core.gitOps, agentInstructions, config.autoCommit);
			mcpResults.agentFiles = `Created: ${agentInstructions.join(", ")}`;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			mcpResults.agentFiles = `Failed: ${message}`;
		}
	}

	if (integrationMode === "cli" && installClaudeAgentFlag) {
		try {
			await installClaudeAgent(projectRoot);
			mcpResults.claudeAgent = "Installed to .claude/agents/";
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			mcpResults.claudeAgent = `Failed: ${message}`;
		}
	}

	return {
		success: true,
		projectName,
		isReInitialization,
		config,
		mcpResults: Object.keys(mcpResults).length > 0 ? mcpResults : undefined,
	};
}
