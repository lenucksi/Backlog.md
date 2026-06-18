import { spawn } from "bun";
import {
	type AgentInstructionFile,
	addAgentInstructions,
	ensureMcpGuidelines,
	installClaudeAgent,
} from "../agent-instructions.ts";
import type { BacklogConfig } from "../types/index.ts";
import { normalizeProjectBacklogDirectory } from "../utils/backlog-directory.ts";
import { getSchemaDefaults } from "../utils/config-schema.ts";
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
		statuses?: string[];
		terminalStatuses?: string[];
		blockedStatuses?: string[];
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

function resolveOverrideValue<T>(
	advanced: Record<string, unknown>,
	key: string,
	existing: T | undefined,
	fallback: T,
): T {
	return (advanced[key] as T | undefined) ?? existing ?? fallback;
}

function buildInitConfig(
	projectName: string,
	existingConfig: BacklogConfig | null | undefined,
	normalizedAdvancedConfig: Record<string, unknown>,
	effectiveFilesystemOnly: boolean,
): BacklogConfig {
	const d = getSchemaDefaults();

	const config: BacklogConfig = {
		...(existingConfig ?? ({} as BacklogConfig)),
		statuses: resolveOverrideValue(normalizedAdvancedConfig, "statuses", existingConfig?.statuses, [
			"To Do",
			"In Progress",
			"Done",
		]),
		labels: existingConfig?.labels ?? [],
		defaultStatus: existingConfig?.defaultStatus ?? "To Do",
		maxColumnWidth: existingConfig?.maxColumnWidth ?? 20,
		projectName,
		filesystemOnly: effectiveFilesystemOnly,
		autoCommit: resolveOverrideValue(normalizedAdvancedConfig, "autoCommit", existingConfig?.autoCommit, d.autoCommit),
		remoteOperations: resolveOverrideValue(
			normalizedAdvancedConfig,
			"remoteOperations",
			existingConfig?.remoteOperations,
			d.remoteOperations,
		),
		bypassGitHooks: resolveOverrideValue(
			normalizedAdvancedConfig,
			"bypassGitHooks",
			existingConfig?.bypassGitHooks,
			d.bypassGitHooks,
		),
		checkActiveBranches: resolveOverrideValue(
			normalizedAdvancedConfig,
			"checkActiveBranches",
			existingConfig?.checkActiveBranches,
			d.checkActiveBranches,
		),
		activeBranchDays: resolveOverrideValue(
			normalizedAdvancedConfig,
			"activeBranchDays",
			existingConfig?.activeBranchDays,
			d.activeBranchDays,
		),
		defaultPort: resolveOverrideValue(
			normalizedAdvancedConfig,
			"defaultPort",
			existingConfig?.defaultPort,
			d.defaultPort,
		),
		autoOpenBrowser: resolveOverrideValue(
			normalizedAdvancedConfig,
			"autoOpenBrowser",
			existingConfig?.autoOpenBrowser,
			d.autoOpenBrowser,
		),
		taskResolutionStrategy: existingConfig?.taskResolutionStrategy || "most_recent",
		prefixes: existingConfig?.prefixes || {
			task: (normalizedAdvancedConfig.taskPrefix as string | undefined) || "task",
		},
	};

	const hasTerminalStatusesOverride = Object.hasOwn(normalizedAdvancedConfig, "terminalStatuses");
	const hasBlockedStatusesOverride = Object.hasOwn(normalizedAdvancedConfig, "blockedStatuses");
	const hasDefaultEditorOverride = Object.hasOwn(normalizedAdvancedConfig, "defaultEditor");
	const hasZeroPaddedIdsOverride = Object.hasOwn(normalizedAdvancedConfig, "zeroPaddedIds");
	const hasDefinitionOfDoneOverride = Object.hasOwn(normalizedAdvancedConfig, "definitionOfDone");

	if (hasDefaultEditorOverride) {
		if (normalizedAdvancedConfig.defaultEditor) {
			config.defaultEditor = normalizedAdvancedConfig.defaultEditor as string;
		} else {
			delete config.defaultEditor;
		}
	}
	if (hasZeroPaddedIdsOverride) {
		if (typeof normalizedAdvancedConfig.zeroPaddedIds === "number" && normalizedAdvancedConfig.zeroPaddedIds > 0) {
			config.zeroPaddedIds = normalizedAdvancedConfig.zeroPaddedIds as number;
		} else {
			delete config.zeroPaddedIds;
		}
	}
	if (hasDefinitionOfDoneOverride) {
		if (Array.isArray(normalizedAdvancedConfig.definitionOfDone)) {
			config.definitionOfDone = [...(normalizedAdvancedConfig.definitionOfDone as string[])];
		} else {
			delete config.definitionOfDone;
		}
	}

	if (hasTerminalStatusesOverride) {
		if (
			Array.isArray(normalizedAdvancedConfig.terminalStatuses) &&
			normalizedAdvancedConfig.terminalStatuses.length > 0
		) {
			config.terminalStatuses = [...(normalizedAdvancedConfig.terminalStatuses as string[])];
		} else {
			delete config.terminalStatuses;
		}
	}

	if (hasBlockedStatusesOverride) {
		if (
			Array.isArray(normalizedAdvancedConfig.blockedStatuses) &&
			normalizedAdvancedConfig.blockedStatuses.length > 0
		) {
			config.blockedStatuses = [...(normalizedAdvancedConfig.blockedStatuses as string[])];
		} else {
			delete config.blockedStatuses;
		}
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

function resolveConfigLocation(
	source: string | undefined,
	configOption: "folder" | "root" | undefined,
): "folder" | "root" {
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
	await core.filesystem.migrateCompletedTasks();
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
