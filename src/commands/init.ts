import * as clack from "@clack/prompts";
import { $, spawn } from "bun";
import type { Command } from "commander";
import { DEFAULT_DIRECTORIES, DEFAULT_FILES } from "../constants/index.ts";
import { Core } from "../core/backlog.ts";
import { initializeProject, MCP_GUIDE_URL, MCP_SERVER_NAME } from "../core/init.ts";
import {
	type AgentInstructionFile,
	type EnsureMcpGuidelinesResult,
	ensureMcpGuidelines,
	initializeGitRepository,
	isGitRepository,
} from "../index.ts";
import type { BacklogConfig } from "../types/index.ts";
import type { AgentSelectionValue } from "../utils/agent-selection.ts";
import { processAgentSelection } from "../utils/agent-selection.ts";
import { AppError } from "../utils/app-error.ts";
import { normalizeProjectBacklogDirectory } from "../utils/backlog-directory.ts";
import { resolveRuntimeCwd } from "../utils/runtime-cwd.ts";
import { runAdvancedConfigWizard } from "./advanced-config-wizard.ts";

import type { CompletionInstallResult } from "./completion.ts";
import { installCompletion } from "./completion.ts";

type IntegrationMode = "mcp" | "cli" | "none";

function normalizeIntegrationOption(value: string): IntegrationMode | null {
	const normalized = value.trim().toLowerCase();
	if (
		normalized === "mcp" ||
		normalized === "connector" ||
		normalized === "model-context-protocol" ||
		normalized === "model_context_protocol"
	) {
		return "mcp";
	}
	if (
		normalized === "cli" ||
		normalized === "legacy" ||
		normalized === "commands" ||
		normalized === "command" ||
		normalized === "instructions" ||
		normalized === "instruction" ||
		normalized === "agent" ||
		normalized === "agents"
	) {
		return "cli";
	}
	if (
		normalized === "none" ||
		normalized === "skip" ||
		normalized === "manual" ||
		normalized === "later" ||
		normalized === "no" ||
		normalized === "off"
	) {
		return "none";
	}
	return null;
}

async function openUrlInBrowser(url: string): Promise<void> {
	let cmd: string[];
	if (process.platform === "darwin") {
		cmd = ["open", url];
	} else if (process.platform === "win32") {
		cmd = ["cmd", "/c", "start", "", url];
	} else {
		cmd = ["xdg-open", url];
	}
	try {
		await $`${cmd}`.quiet();
	} catch (error) {
		const message = AppError.formatCLIError(error);
		console.warn(`  ⚠️  Unable to open browser automatically (${message}). Please visit ${url}`);
	}
}

async function runMcpClientCommand(label: string, command: string, args: string[]): Promise<string> {
	console.log(`    Configuring ${label}...`);
	try {
		const child = spawn({
			cmd: [command, ...args],
			stdout: "inherit",
			stderr: "inherit",
		});
		await child.exited;
		console.log(`    ✓ Added Backlog MCP server to ${label}`);
		return label;
	} catch (error) {
		const message = AppError.formatCLIError(error);
		console.warn(`    ⚠️ Unable to configure ${label} automatically (${message}).`);
		console.warn(`       Run manually: ${command} ${args.join(" ")}`);
		return `${label} (manual setup required)`;
	}
}

function getDefaultAdvancedConfig(existingConfig?: BacklogConfig | null): Partial<BacklogConfig> {
	return {
		checkActiveBranches: existingConfig?.checkActiveBranches ?? true,
		remoteOperations: existingConfig?.remoteOperations ?? true,
		activeBranchDays: existingConfig?.activeBranchDays ?? 30,
		bypassGitHooks: existingConfig?.bypassGitHooks ?? false,
		autoCommit: existingConfig?.autoCommit ?? false,
		zeroPaddedIds: existingConfig?.zeroPaddedIds,
		defaultEditor: existingConfig?.defaultEditor,
		definitionOfDone: existingConfig?.definitionOfDone ? [...existingConfig.definitionOfDone] : undefined,
		defaultPort: existingConfig?.defaultPort ?? 6420,
		autoOpenBrowser: existingConfig?.autoOpenBrowser ?? true,
	};
}

interface InitCommandOptions {
	agentInstructions?: string;
	checkBranches?: string;
	includeRemote?: string;
	branchDays?: string;
	bypassGitHooks?: string;
	zeroPaddedIds?: string;
	defaultEditor?: string;
	webPort?: string;
	autoOpenBrowser?: string;
	installClaudeAgent?: string;
	integrationMode?: string;
	backlogDir?: string;
	configLocation?: string;
	taskPrefix?: string;
	git?: boolean;
	defaults?: boolean;
}

async function resolveProjectName(
	projectName: string | undefined,
	existingConfig: BacklogConfig | null | undefined,
	isReInitialization: boolean,
): Promise<string | null> {
	let name = projectName;
	if (!name) {
		const defaultName = existingConfig?.projectName || "";
		const enteredName = await clack.text({
			message: isReInitialization && defaultName ? `Project name (${defaultName}):` : "Project name:",
			defaultValue: isReInitialization && defaultName ? defaultName : undefined,
			validate: (value) => {
				if (!isReInitialization || !defaultName) {
					if (!String(value ?? "").trim()) {
						return "Project name is required.";
					}
				}
				return undefined;
			},
		});
		if (clack.isCancel(enteredName)) {
			return null;
		}
		name = String(enteredName ?? "").trim();
		if (!name && isReInitialization && defaultName) {
			name = defaultName;
		}
		if (!name) {
			return null;
		}
	}
	return name;
}

interface BacklogLocationResult {
	backlogDirectory: string | undefined;
	backlogDirectorySource: "backlog" | ".backlog" | "custom" | undefined;
	configLocation: "folder" | "root" | undefined;
}

async function resolveBacklogLocation(
	core: Core,
	options: InitCommandOptions,
	isNonInteractive: boolean,
): Promise<BacklogLocationResult | null> {
	const backlogResolution = core.filesystem.resolveBacklogDirectoryInfo();
	const defaultBacklogDirectory = backlogResolution.backlogDir ?? DEFAULT_DIRECTORIES.BACKLOG;
	const defaultBacklogSource = backlogResolution.source ?? "backlog";
	const defaultConfigLocation = backlogResolution.configSource ?? "folder";
	const normalizedBacklogDirOption = options.backlogDir
		? normalizeProjectBacklogDirectory(options.backlogDir)
		: undefined;
	const normalizedConfigLocation = options.configLocation?.trim().toLowerCase();
	if (options.backlogDir && !normalizedBacklogDirOption) {
		console.error(
			"Invalid --backlog-dir value. Use 'backlog', '.backlog', or a project-relative path inside the project.",
		);
		process.exit(1);
	}
	if (normalizedConfigLocation && normalizedConfigLocation !== "folder" && normalizedConfigLocation !== "root") {
		console.error("Invalid --config-location value. Use 'folder' or 'root'.");
		process.exit(1);
	}

	if (isNonInteractive) {
		let backlogDirectory: string | undefined;
		let backlogDirectorySource: "backlog" | ".backlog" | "custom" | undefined;
		let configLocation: "folder" | "root" | undefined;
		if (normalizedBacklogDirOption) {
			backlogDirectory = normalizedBacklogDirOption;
			backlogDirectorySource =
				normalizedBacklogDirOption === DEFAULT_DIRECTORIES.BACKLOG ||
				normalizedBacklogDirOption === DEFAULT_DIRECTORIES.HIDDEN_BACKLOG
					? (normalizedBacklogDirOption as "backlog" | ".backlog")
					: "custom";
		} else {
			backlogDirectory = defaultBacklogDirectory;
			backlogDirectorySource = defaultBacklogSource;
		}
		configLocation =
			(normalizedConfigLocation as "folder" | "root" | undefined) ??
			(backlogDirectorySource === "custom" ? "root" : defaultConfigLocation);
		if (backlogDirectorySource === "custom" && configLocation !== "root") {
			console.error("Custom backlog directories require --config-location root.");
			process.exit(1);
		}
		return { backlogDirectory, backlogDirectorySource, configLocation };
	}

	const locationPrompt = await clack.select({
		message: "Where should Backlog.md store project files?",
		initialValue: defaultBacklogSource,
		options: [
			{
				label: "backlog/ (default)",
				value: "backlog",
				hint: "Store tasks and config in backlog/",
			},
			{
				label: ".backlog/",
				value: ".backlog",
				hint: "Store tasks and config in .backlog/",
			},
			{
				label: "Custom project-relative path",
				value: "custom",
				hint: `Backlog.md will store project config in ${backlogResolution.rootConfigPath}`,
			},
		],
	});
	if (clack.isCancel(locationPrompt)) {
		return null;
	}

	const backlogDirectorySource = locationPrompt as "backlog" | ".backlog" | "custom";
	let backlogDirectory: string | undefined;
	let configLocation: "folder" | "root" | undefined;
	if (backlogDirectorySource === "custom") {
		const customDirectory = await clack.text({
			message: "Project-relative backlog directory:",
			defaultValue: defaultBacklogSource === "custom" && defaultBacklogDirectory ? defaultBacklogDirectory : "",
			validate: (value) => {
				const normalized = normalizeProjectBacklogDirectory(String(value ?? ""));
				if (!normalized) {
					return "Enter a project-relative path inside the current project.";
				}
				return undefined;
			},
		});
		if (clack.isCancel(customDirectory)) {
			return null;
		}
		backlogDirectory = normalizeProjectBacklogDirectory(String(customDirectory ?? "")) ?? undefined;
		configLocation = "root";
	} else {
		backlogDirectory = backlogDirectorySource;
		const configPrompt = await clack.select({
			message: "Where should Backlog.md store project configuration?",
			initialValue: defaultConfigLocation,
			options: [
				{
					label: `${backlogDirectorySource}/config.yml`,
					value: "folder",
					hint: "Keep config inside the backlog folder",
				},
				{
					label: "backlog.config.yml in project root",
					value: "root",
					hint: "Keep config at project root and point to the backlog folder there",
				},
			],
		});
		if (clack.isCancel(configPrompt)) {
			return null;
		}
		configLocation = configPrompt as "folder" | "root";
	}
	return { backlogDirectory, backlogDirectorySource, configLocation };
}

interface IntegrationStateResult {
	integrationMode: IntegrationMode | null;
	agentFiles: AgentInstructionFile[];
	agentInstructionsSkipped: boolean;
	mcpClientSetupSummary: string | undefined;
}

async function resolveIntegrationModeState(
	options: InitCommandOptions,
	isNonInteractive: boolean,
	cwd: string,
): Promise<IntegrationStateResult | null> {
	const integrationOption = options.integrationMode ? normalizeIntegrationOption(options.integrationMode) : undefined;
	if (options.integrationMode && !integrationOption) {
		console.error(`Invalid integration mode: ${options.integrationMode}. Valid options are: mcp, cli, none`);
		process.exit(1);
	}

	let integrationMode: IntegrationMode | null = integrationOption ?? (isNonInteractive ? "mcp" : null);
	type AgentSelection = AgentSelectionValue;
	let agentFiles: AgentInstructionFile[] = [];
	let agentInstructionsSkipped = false;
	let mcpClientSetupSummary: string | undefined;
	const mcpServerName = MCP_SERVER_NAME;

	if (!integrationOption && integrationMode === "mcp" && (options.agentInstructions || options.installClaudeAgent)) {
		integrationMode = "cli";
	}

	if (integrationMode === "mcp" && (options.agentInstructions || options.installClaudeAgent)) {
		console.error("The MCP connector option cannot be combined with --agent-instructions or --install-claude-agent.");
		process.exit(1);
	}

	if (integrationMode === "none" && (options.agentInstructions || options.installClaudeAgent)) {
		console.error("Skipping AI integration cannot be combined with --agent-instructions or --install-claude-agent.");
		process.exit(1);
	}

	let integrationTipShown = false;
	mainSelection: while (true) {
		if (integrationMode === null) {
			if (!integrationTipShown) {
				clack.note("MCP connector is recommended for AI tool integration.", "AI setup tip");
				integrationTipShown = true;
			}
			const integrationPrompt = await clack.select({
				message: "How would you like your AI tools to connect to Backlog.md?",
				initialValue: "mcp",
				options: [
					{
						label: "via MCP connector (recommended for Claude Code, Codex, Gemini CLI, Kiro, Cursor, etc.)",
						value: "mcp",
					},
					{
						label: "via CLI commands (broader compatibility)",
						value: "cli",
					},
					{
						label: "Skip for now (I am not using Backlog.md with AI tools)",
						value: "none",
					},
				],
			});

			if (clack.isCancel(integrationPrompt)) {
				return null;
			}

			const selectedMode = integrationPrompt ? normalizeIntegrationOption(String(integrationPrompt)) : null;
			integrationMode = selectedMode ?? "mcp";
			console.log("");
		}

		if (integrationMode === "cli") {
			if (options.agentInstructions) {
				const nameMap: Record<string, AgentSelection> = {
					cursor: "AGENTS.md",
					claude: "CLAUDE.md",
					agents: "AGENTS.md",
					gemini: "GEMINI.md",
					copilot: ".github/copilot-instructions.md",
					none: "none",
					"CLAUDE.md": "CLAUDE.md",
					"AGENTS.md": "AGENTS.md",
					"GEMINI.md": "GEMINI.md",
					".github/copilot-instructions.md": ".github/copilot-instructions.md",
				};

				const requestedInstructions = options.agentInstructions.split(",").map((f) => f.trim().toLowerCase());
				const mappedFiles: AgentSelection[] = [];

				for (const instruction of requestedInstructions) {
					const mappedFile = nameMap[instruction];
					if (!mappedFile) {
						console.error(`Invalid agent instruction: ${instruction}`);
						console.error("Valid options are: cursor, claude, agents, gemini, copilot, none");
						process.exit(1);
					}
					mappedFiles.push(mappedFile);
				}

				const { files, needsRetry, skipped } = processAgentSelection({
					selected: mappedFiles,
				});

				if (needsRetry) {
					console.error("Please select at least one agent instruction file before continuing.");
					process.exit(1);
				}
				agentFiles = files;
				agentInstructionsSkipped = skipped;
			} else if (isNonInteractive) {
				agentFiles = [];
			} else {
				while (true) {
					const response = await clack.multiselect({
						message: "Select instruction files for CLI-based AI tools (space toggles selections; enter accepts)",
						options: [
							{ label: "CLAUDE.md — Claude Code", value: "CLAUDE.md" },
							{
								label: "AGENTS.md — Codex, Cursor, Zed, Warp, Aider, RooCode, etc.",
								value: "AGENTS.md",
							},
							{
								label: "GEMINI.md — Google Gemini Code Assist CLI",
								value: "GEMINI.md",
							},
							{
								label: "Copilot instructions — GitHub Copilot",
								value: ".github/copilot-instructions.md",
							},
						],
						required: false,
					});

					if (clack.isCancel(response)) {
						integrationMode = null;
						continue mainSelection;
					}

					const selected = Array.isArray(response) ? (response as AgentSelection[]) : [];
					const { files, needsRetry, skipped } = processAgentSelection({ selected });
					if (needsRetry) {
						console.log("Please select at least one agent instruction file before continuing.");
						continue;
					}
					agentFiles = files;
					agentInstructionsSkipped = skipped;
					break;
				}
			}

			break;
		}

		if (integrationMode === "mcp") {
			if (isNonInteractive) {
				mcpClientSetupSummary = "skipped (non-interactive)";
				break;
			}

			console.log(`  MCP server name: ${mcpServerName}`);
			while (true) {
				const clientResponse = await clack.multiselect({
					message: "Which AI tools should we configure right now? (space toggles items; enter confirms)",
					options: [
						{ label: "Claude Code", value: "claude" },
						{ label: "OpenAI Codex", value: "codex" },
						{ label: "Gemini CLI", value: "gemini" },
						{ label: "Kiro", value: "kiro" },
						{ label: "Other (open setup guide)", value: "guide" },
					],
					required: true,
				});

				if (clack.isCancel(clientResponse)) {
					integrationMode = null;
					continue mainSelection;
				}

				const selectedClients = Array.isArray(clientResponse) ? clientResponse : [];
				if (selectedClients.length === 0) {
					console.log("Please select at least one AI tool before continuing.");
					continue;
				}

				const results: string[] = [];
				const mcpGuidelineUpdates: EnsureMcpGuidelinesResult[] = [];
				const recordGuidelinesForClient = async (clientKey: string) => {
					const clientFileMap: Record<string, AgentInstructionFile> = {
						claude: "CLAUDE.md",
						codex: "AGENTS.md",
						gemini: "GEMINI.md",
						kiro: "AGENTS.md",
						guide: "AGENTS.md",
					};
					const instructionFile = clientFileMap[clientKey];
					if (!instructionFile) {
						return;
					}
					const nudgeResult = await ensureMcpGuidelines(cwd, instructionFile);
					if (nudgeResult.changed) {
						mcpGuidelineUpdates.push(nudgeResult);
					}
				};
				const uniq = (values: string[]) => [...new Set(values)];

				for (const client of selectedClients) {
					if (client === "claude") {
						const result = await runMcpClientCommand("Claude Code", "claude", [
							"mcp",
							"add",
							"-s",
							"user",
							mcpServerName,
							"--",
							"backlog",
							"mcp",
							"start",
						]);
						results.push(result);
						await recordGuidelinesForClient(client);
						continue;
					}
					if (client === "codex") {
						const result = await runMcpClientCommand("OpenAI Codex", "codex", [
							"mcp",
							"add",
							mcpServerName,
							"backlog",
							"mcp",
							"start",
						]);
						results.push(result);
						await recordGuidelinesForClient(client);
						continue;
					}
					if (client === "gemini") {
						const result = await runMcpClientCommand("Gemini CLI", "gemini", [
							"mcp",
							"add",
							"-s",
							"user",
							mcpServerName,
							"backlog",
							"mcp",
							"start",
						]);
						results.push(result);
						await recordGuidelinesForClient(client);
						continue;
					}
					if (client === "kiro") {
						const result = await runMcpClientCommand("Kiro", "kiro-cli", [
							"mcp",
							"add",
							"--scope",
							"global",
							"--name",
							mcpServerName,
							"--command",
							"backlog",
							"--args",
							"mcp,start",
						]);
						results.push(result);
						await recordGuidelinesForClient(client);
						continue;
					}
					if (client === "guide") {
						console.log("    Opening MCP setup guide in your browser...");
						await openUrlInBrowser(MCP_GUIDE_URL);
						results.push("Setup guide opened");
						await recordGuidelinesForClient(client);
					}
				}

				if (mcpGuidelineUpdates.length > 0) {
					const createdFiles = uniq(
						mcpGuidelineUpdates.filter((entry) => entry.created).map((entry) => entry.fileName),
					);
					const updatedFiles = uniq(
						mcpGuidelineUpdates.filter((entry) => !entry.created).map((entry) => entry.fileName),
					);
					if (createdFiles.length > 0) {
						console.log(`    Created MCP reminder file(s): ${createdFiles.join(", ")}`);
					}
					if (updatedFiles.length > 0) {
						console.log(`    Added MCP reminder to ${updatedFiles.join(", ")}`);
					}
				}

				mcpClientSetupSummary = results.join(", ");
				break;
			}

			break;
		}

		if (integrationMode === "none") {
			agentFiles = [];
			agentInstructionsSkipped = false;
			break;
		}
	}

	return { integrationMode, agentFiles, agentInstructionsSkipped, mcpClientSetupSummary };
}

function renderInitSummary(
	_name: string,
	config: BacklogConfig,
	backlogDirectory: string | undefined,
	backlogDirName: string,
	configLocation: "folder" | "root" | undefined,
	gitIntegrationDisabled: boolean,
	integrationMode: IntegrationMode | null,
	agentFiles: AgentInstructionFile[],
	agentInstructionsSkipped: boolean,
	mcpServerName: string,
	mcpClientSetupSummary: string | undefined,
	completionInstallResult: CompletionInstallResult | null,
	completionInstallError: string | null,
	installShellCompletionsSelection: boolean,
	advancedConfigured: boolean,
): void {
	const supportsColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
	const colorize = (code: string, value: string): string =>
		supportsColor ? `\u001B[${code}m${value}\u001B[0m` : value;
	const label = (value: string): string => colorize("1;36", value);
	const good = (value: string): string => colorize("32", value);
	const bad = (value: string): string => colorize("31", value);
	const muted = (value: string): string => colorize("2", value);
	const boolValue = (value: boolean): string => (value ? good("true") : bad("false"));
	const formatCompletionInstructions = (instructions: string): string =>
		instructions
			.split("\n")
			.map((line) => {
				const trimmed = line.trim();
				if (!trimmed) {
					return line;
				}
				if (/^(path=|autoload|source )/.test(trimmed)) {
					return colorize("1;32", line);
				}
				if (
					/^(To enable completions, ensure the directory is in your fpath\.|Add this to your ~\/\.zshrc:|Then restart your shell or run:)$/.test(
						trimmed,
					)
				) {
					return colorize("36", line);
				}
				return line;
			})
			.join("\n");
	const summaryLines: string[] = [`${label("Project Name:")} ${colorize("1", config.projectName)}`];
	summaryLines.push(`${label("Backlog directory:")} ${backlogDirectory ?? backlogDirName}`);
	summaryLines.push(
		`${label("Config location:")} ${configLocation === "root" ? DEFAULT_FILES.ROOT_CONFIG : "folder config.yml"}`,
	);
	summaryLines.push(
		`${label("Git integration:")} ${gitIntegrationDisabled ? muted("disabled (filesystem-only)") : good("enabled")}`,
	);
	if (integrationMode === "cli") {
		summaryLines.push(`${label("AI Integration:")} ${muted("CLI commands (legacy)")}`);
		if (agentFiles.length > 0) {
			summaryLines.push(`${label("Agent instructions:")} ${agentFiles.join(", ")}`);
		} else if (agentInstructionsSkipped) {
			summaryLines.push(`${label("Agent instructions:")} ${muted("skipped")}`);
		} else {
			summaryLines.push(`${label("Agent instructions:")} ${muted("none")}`);
		}
	} else if (integrationMode === "mcp") {
		summaryLines.push(`${label("AI Integration:")} ${good("MCP connector")}`);
		summaryLines.push(
			`${label("Agent instruction files:")} ${muted("guidance is provided through the MCP connector.")}`,
		);
		summaryLines.push(`${label("MCP server name:")} ${mcpServerName}`);
		summaryLines.push(`${label("MCP client setup:")} ${mcpClientSetupSummary ?? muted("skipped")}`);
	} else {
		summaryLines.push(`${label("AI integration:")} ${muted("skipped (configure later via `backlog init`)")}`);
	}
	let completionSummary: string;
	if (completionInstallResult) {
		completionSummary = `${good("installed")} to ${completionInstallResult.installPath}`;
	} else if (installShellCompletionsSelection) {
		completionSummary = `${bad("installation failed")} (${muted("see warning below")})`;
	} else if (advancedConfigured) {
		completionSummary = muted("skipped");
	} else {
		completionSummary = muted("not configured");
	}
	summaryLines.push(`${label("Shell completions:")} ${completionSummary}`);
	if (advancedConfigured || gitIntegrationDisabled) {
		summaryLines.push(label("Advanced settings:"));
		summaryLines.push(`  ${label("Check active branches:")} ${boolValue(Boolean(config.checkActiveBranches))}`);
		summaryLines.push(`  ${label("Remote operations:")} ${boolValue(Boolean(config.remoteOperations))}`);
		summaryLines.push(`  ${label("Active branch days:")} ${String(config.activeBranchDays)}`);
		summaryLines.push(`  ${label("Bypass git hooks:")} ${boolValue(Boolean(config.bypassGitHooks))}`);
		summaryLines.push(`  ${label("Auto commit:")} ${boolValue(Boolean(config.autoCommit))}`);
		summaryLines.push(
			`  ${label("Zero-padded IDs:")} ${
				config.zeroPaddedIds ? `${String(config.zeroPaddedIds)} digits` : muted("disabled")
			}`,
		);
		summaryLines.push(`  ${label("Web UI port:")} ${String(config.defaultPort)}`);
		summaryLines.push(`  ${label("Auto open browser:")} ${boolValue(Boolean(config.autoOpenBrowser))}`);
		if (config.defaultEditor) {
			summaryLines.push(`  ${label("Default editor:")} ${config.defaultEditor}`);
		}
		summaryLines.push(
			`  ${label("Definition of Done defaults:")} ${
				(config.definitionOfDone ?? []).length > 0 ? config.definitionOfDone?.join(" | ") : muted("none")
			}`,
		);
	} else {
		summaryLines.push(`${label("Advanced settings:")} ${muted("unchanged (run `backlog config` to customize)")}`);
	}
	clack.note(summaryLines.join("\n"), "Initialization Summary");

	if (completionInstallResult) {
		const instructions = completionInstallResult.instructions.trim();
		clack.note(
			[
				`${label("Path:")} ${colorize("1", completionInstallResult.installPath)}`,
				formatCompletionInstructions(instructions),
			].join("\n\n"),
			`Shell completions installed (${completionInstallResult.shell})`,
		);
	} else if (completionInstallError) {
		const indentedError = completionInstallError
			.split("\n")
			.map((line) => `  ${line}`)
			.join("\n");
		console.warn(
			`\u26A0\uFE0F  Shell completion installation failed:\n${indentedError}\n  Run \`backlog completion install\` later to retry.\n`,
		);
	}
}

async function handleInitCommand(projectName: string | undefined, options: InitCommandOptions) {
	try {
		const { cwd } = await resolveRuntimeCwd();
		const isRepo = await isGitRepository(cwd);
		let filesystemOnly = options.git === false;

		if (!isRepo && !filesystemOnly) {
			const repositoryMode = await clack.select({
				message: "No git repository found. How should Backlog.md initialize this project?",
				initialValue: "git",
				options: [
					{
						label: "Initialize a Git repository",
						value: "git",
						hint: "Use the standard Git-backed workflow",
					},
					{
						label: "Continue without Git",
						value: "filesystem",
						hint: "Use local Markdown files only",
					},
				],
			});
			if (clack.isCancel(repositoryMode)) {
				abortInitialization();
				return;
			}

			if (repositoryMode === "git") {
				await initializeGitRepository(cwd);
			} else {
				filesystemOnly = true;
			}
		}

		const core = new Core(cwd);

		const existingConfig = await core.filesystem.loadConfig();
		const isReInitialization = !!existingConfig;

		if (isReInitialization) {
			console.log("Existing backlog project detected. Current configuration will be preserved where not specified.");
			if (options.backlogDir) {
				console.error(
					"The backlog directory is fixed after initialization. Re-run init without --backlog-dir for this project.",
				);
				process.exit(1);
			}
			if (options.configLocation) {
				console.error(
					"The config location is fixed after initialization. Re-run init without --config-location for this project.",
				);
				process.exit(1);
			}
		}

		const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
			if (value === undefined) return defaultValue;
			return value.toLowerCase() === "true" || value === "1";
		};

		const parseNumber = (value: string | undefined, defaultValue: number): number => {
			if (value === undefined) return defaultValue;
			const parsed = Number.parseInt(value, 10);
			return Number.isNaN(parsed) ? defaultValue : parsed;
		};
		function abortInitialization(message = "Aborting initialization.") {
			clack.cancel(message);
			process.exitCode = 1;
		}
		function cancelInitialization(message = "Initialization cancelled.") {
			clack.cancel(message);
		}

		const isNonInteractive = !!(
			options.agentInstructions ||
			options.defaults ||
			options.checkBranches ||
			options.includeRemote ||
			options.branchDays ||
			options.bypassGitHooks ||
			options.zeroPaddedIds ||
			options.defaultEditor ||
			options.webPort ||
			options.autoOpenBrowser ||
			options.installClaudeAgent ||
			options.integrationMode ||
			options.backlogDir ||
			options.configLocation ||
			options.taskPrefix ||
			options.git === false
		);

		const name = await resolveProjectName(projectName, existingConfig, isReInitialization);
		if (!name) return;

		let backlogDirectory: string | undefined;
		let backlogDirectorySource: "backlog" | ".backlog" | "custom" | undefined;
		let configLocation: "folder" | "root" | undefined;
		if (!isReInitialization) {
			const location = await resolveBacklogLocation(core, options, isNonInteractive);
			if (!location) {
				abortInitialization();
				return;
			}
			backlogDirectory = location.backlogDirectory;
			backlogDirectorySource = location.backlogDirectorySource;
			configLocation = location.configLocation;
		}

		let taskPrefix = options.taskPrefix;
		if (!taskPrefix && !isNonInteractive && !isReInitialization) {
			const enteredPrefix = await clack.text({
				message: "Task prefix (default: task):",
				validate: (value) => {
					const normalized = String(value ?? "").trim();
					if (!normalized) {
						return undefined;
					}
					if (!/^[a-zA-Z]+$/.test(normalized)) {
						return "Task prefix must contain only letters (a-z, A-Z).";
					}
					return undefined;
				},
			});
			if (clack.isCancel(enteredPrefix)) {
				abortInitialization();
				return;
			}
			taskPrefix = String(enteredPrefix ?? "").trim();
		}
		if (taskPrefix && !/^[a-zA-Z]+$/.test(taskPrefix)) {
			console.error("Task prefix must contain only letters (a-z, A-Z).");
			process.exit(1);
		}

		const defaultAdvancedConfig = getDefaultAdvancedConfig(existingConfig);
		const applyAdvancedOptionOverrides = () => {
			const result: Partial<BacklogConfig> = { ...defaultAdvancedConfig };
			result.checkActiveBranches = parseBoolean(options.checkBranches, result.checkActiveBranches ?? true);
			if (result.checkActiveBranches) {
				result.remoteOperations = parseBoolean(options.includeRemote, result.remoteOperations ?? true);
				result.activeBranchDays = parseNumber(options.branchDays, result.activeBranchDays ?? 30);
			} else {
				result.remoteOperations = false;
			}
			result.bypassGitHooks = parseBoolean(options.bypassGitHooks, result.bypassGitHooks ?? false);
			const paddingValue = parseNumber(options.zeroPaddedIds, result.zeroPaddedIds ?? 0);
			result.zeroPaddedIds = paddingValue > 0 ? paddingValue : undefined;
			result.defaultEditor =
				options.defaultEditor || existingConfig?.defaultEditor || process.env.EDITOR || process.env.VISUAL || undefined;
			result.defaultPort = parseNumber(options.webPort, result.defaultPort ?? 6420);
			result.autoOpenBrowser = parseBoolean(options.autoOpenBrowser, result.autoOpenBrowser ?? true);
			return result;
		};

		const integrationState = await resolveIntegrationModeState(options, isNonInteractive, cwd);
		if (!integrationState) {
			cancelInitialization();
			return;
		}
		const { integrationMode, agentFiles, agentInstructionsSkipped, mcpClientSetupSummary } = integrationState;
		const mcpServerName = MCP_SERVER_NAME;

		let advancedConfig: Partial<BacklogConfig> = { ...defaultAdvancedConfig };
		let advancedConfigured = false;
		let installClaudeAgentSelection = false;
		let installShellCompletionsSelection = false;
		let completionInstallResult: CompletionInstallResult | null = null;
		let completionInstallError: string | null = null;

		if (isNonInteractive) {
			advancedConfig = applyAdvancedOptionOverrides();
			installClaudeAgentSelection = integrationMode === "cli" ? parseBoolean(options.installClaudeAgent, false) : false;
		} else {
			const advancedPrompt = await clack.confirm({
				message: "Configure advanced settings now? (Runs the advanced backlog config wizard)",
				initialValue: false,
			});
			if (clack.isCancel(advancedPrompt)) {
				abortInitialization();
				return;
			}

			if (advancedPrompt) {
				const wizardResult = await runAdvancedConfigWizard({
					existingConfig,
					cancelMessage: "Aborting initialization.",
					includeClaudePrompt: integrationMode === "cli",
				});
				advancedConfig = { ...defaultAdvancedConfig, ...wizardResult.config };
				installClaudeAgentSelection = integrationMode === "cli" ? wizardResult.installClaudeAgent : false;
				installShellCompletionsSelection = wizardResult.installShellCompletions;
				if (wizardResult.installShellCompletions) {
					try {
						completionInstallResult = await installCompletion();
					} catch (error) {
						completionInstallError = AppError.formatCLIError(error);
					}
				}
				advancedConfigured = true;
			}
		}
		if (filesystemOnly) {
			advancedConfig = {
				...advancedConfig,
				checkActiveBranches: false,
				remoteOperations: false,
				bypassGitHooks: false,
				autoCommit: false,
			};
		}
		const initResult = await initializeProject(core, {
			projectName: name,
			backlogDirectory,
			backlogDirectorySource,
			configLocation,
			integrationMode: integrationMode || "none",
			mcpClients: [],
			agentInstructions: agentFiles,
			installClaudeAgent: installClaudeAgentSelection,
			advancedConfig: {
				statuses: advancedConfig.statuses,
				terminalStatuses: advancedConfig.terminalStatuses,
				blockedStatuses: advancedConfig.blockedStatuses,
				checkActiveBranches: advancedConfig.checkActiveBranches,
				remoteOperations: advancedConfig.remoteOperations,
				activeBranchDays: advancedConfig.activeBranchDays,
				bypassGitHooks: advancedConfig.bypassGitHooks,
				autoCommit: advancedConfig.autoCommit,
				zeroPaddedIds: advancedConfig.zeroPaddedIds,
				defaultEditor: advancedConfig.defaultEditor,
				definitionOfDone: advancedConfig.definitionOfDone,
				defaultPort: advancedConfig.defaultPort,
				autoOpenBrowser: advancedConfig.autoOpenBrowser,
				taskPrefix: taskPrefix || undefined,
			},
			existingConfig,
			filesystemOnly,
		});

		const config = initResult.config;
		const gitIntegrationDisabled = Boolean(config.filesystemOnly);

		renderInitSummary(
			name,
			config,
			backlogDirectory,
			core.filesystem.backlogDirName,
			configLocation,
			gitIntegrationDisabled,
			integrationMode,
			agentFiles,
			agentInstructionsSkipped,
			mcpServerName,
			mcpClientSetupSummary,
			completionInstallResult,
			completionInstallError,
			installShellCompletionsSelection,
			advancedConfigured,
		);

		if (initResult.isReInitialization) {
			clack.outro(`Updated backlog project configuration: ${name}`);
		} else {
			clack.outro(`Initialized backlog project: ${name}`);
		}

		if (integrationMode === "cli") {
			if (initResult.mcpResults?.agentFiles) {
				clack.log.info(initResult.mcpResults.agentFiles);
			} else if (agentInstructionsSkipped) {
				clack.log.info("Skipping agent instruction files per selection.");
			}
		}

		if (integrationMode === "cli" && initResult.mcpResults?.claudeAgent) {
			clack.log.info(`Claude Code Backlog.md agent ${initResult.mcpResults.claudeAgent}`);
		}

		try {
			if (config.remoteOperations) {
				const hasRemotes = await core.gitOps.hasAnyRemote();
				if (!hasRemotes) {
					console.warn(
						[
							"Warning: remoteOperations is enabled but no git remotes are configured.",
							"Remote features will be skipped until a remote is added (e.g., 'git remote add origin <url>')",
							"or disable remoteOperations via 'backlog config set remoteOperations false'.",
						].join(" "),
					);
				}
			}
		} catch {
			// Ignore failures in final advisory warning
		}
	} catch (err) {
		console.error("Failed to initialize project", err);
		process.exitCode = 1;
	}
}

export function registerInitCommand(program: Command): void {
	program
		.command("init [projectName]")
		.description("initialize backlog project in the current directory")
		.option(
			"--agent-instructions <instructions>",
			"comma-separated agent instructions to create. Valid: claude, agents, gemini, copilot, cursor (alias of agents), none. Use 'none' to skip; when combined with others, 'none' is ignored.",
		)
		.option("--check-branches <boolean>", "check task states across active branches (default: true)")
		.option("--include-remote <boolean>", "include remote branches when checking (default: true)")
		.option("--branch-days <number>", "days to consider branch active (default: 30)")
		.option("--bypass-git-hooks <boolean>", "bypass git hooks when committing (default: false)")
		.option("--zero-padded-ids <number>", "number of digits for zero-padding IDs (0 to disable)")
		.option("--default-editor <editor>", "default editor command")
		.option("--web-port <number>", "default web UI port (default: 6420)")
		.option("--auto-open-browser <boolean>", "auto-open browser for web UI (default: true)")
		.option("--install-claude-agent <boolean>", "install Claude Code agent (default: false)")
		.option("--integration-mode <mode>", "choose how AI tools connect to Backlog.md (mcp, cli, or none)")
		.option("--backlog-dir <path>", "backlog folder for init: backlog, .backlog, or a custom project-relative path")
		.option("--config-location <location>", "config location for init: folder or root")
		.option("--task-prefix <prefix>", "custom task prefix, letters only (default: task)")
		.option("--no-git", "initialize without Git integration")
		.option("--defaults", "use default values for all prompts")
		.action(async (projectName, options) => {
			await handleInitCommand(projectName, options);
		});
}
