import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { installClaudeAgent } from "../index.ts";
import { AppError } from "../utils/app-error.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import type { CompletionInstallResult } from "./completion.ts";
import { installCompletion } from "./completion.ts";
import { configureAdvancedSettings } from "./configure-advanced-settings.ts";

export function registerConfigCommand(program: Command): void {
	const configCmd = program
		.command("config")
		.description("manage backlog configuration")
		.action(async () => {
			try {
				const cwd = await requireProjectRoot();
				const core = new Core(cwd);
				const existingConfig = await core.filesystem.loadConfig();

				if (!existingConfig) {
					console.error("No backlog project found. Initialize one first with: backlog init");
					process.exit(1);
				}

				const {
					mergedConfig,
					installClaudeAgent: shouldInstallClaude,
					installShellCompletions: shouldInstallCompletions,
				} = await configureAdvancedSettings(core);

				let completionResult: CompletionInstallResult | null = null;
				let completionError: string | null = null;
				if (shouldInstallCompletions) {
					try {
						completionResult = await installCompletion();
					} catch (error) {
						completionError = AppError.formatCLIError(error);
					}
				}

				console.log("\nAdvanced configuration updated.");
				console.log(`  Check active branches: ${mergedConfig.checkActiveBranches ?? true}`);
				console.log(`  Remote operations: ${mergedConfig.remoteOperations ?? true}`);
				console.log(
					`  Zero-padded IDs: ${
						typeof mergedConfig.zeroPaddedIds === "number" ? `${mergedConfig.zeroPaddedIds} digits` : "disabled"
					}`,
				);
				console.log(`  Web UI port: ${mergedConfig.defaultPort ?? 6420}`);
				console.log(`  Auto open browser: ${mergedConfig.autoOpenBrowser ?? true}`);
				console.log(`  Bypass git hooks: ${mergedConfig.bypassGitHooks ?? false}`);
				console.log(`  Auto commit: ${mergedConfig.autoCommit ?? false}`);
				console.log(`  Definition of Done defaults: ${(mergedConfig.definitionOfDone ?? []).join(" | ") || "(none)"}`);
				if (completionResult) {
					console.log(`  Shell completions: installed to ${completionResult.installPath}`);
				} else if (completionError) {
					console.log("  Shell completions: installation failed (see warning below)");
				} else {
					console.log("  Shell completions: skipped");
				}
				if (mergedConfig.defaultEditor) {
					console.log(`  Default editor: ${mergedConfig.defaultEditor}`);
				}
				if (shouldInstallClaude) {
					await installClaudeAgent(cwd);
					console.log("✓ Claude Code Backlog.md agent installed to .claude/agents/");
				}
				if (completionResult) {
					const instructions = completionResult.instructions.trim();
					console.log(
						[
							"",
							`Shell completion script installed for ${completionResult.shell}.`,
							`  Path: ${completionResult.installPath}`,
							instructions,
							"",
						].join("\n"),
					);
				} else if (completionError) {
					const indentedError = completionError
						.split("\n")
						.map((line) => `  ${line}`)
						.join("\n");
					console.warn(
						`⚠️  Shell completion installation failed:\n${indentedError}\n  Run \`backlog completion install\` later to retry.\n`,
					);
				}
				console.log("\nUse `backlog config list` to review all configuration values.");
			} catch (err) {
				console.error("Failed to update configuration", err);
				process.exitCode = 1;
			}
		});

	configCmd
		.command("get <key>")
		.description("get a configuration value")
		.option("--json", "output as JSON")
		.action(async (key: string, options) => {
			try {
				const cwd = await requireProjectRoot();
				const core = new Core(cwd);
				const config = await core.filesystem.loadConfig();

				if (!config) {
					console.error("No backlog project found. Initialize one first with: backlog init");
					process.exit(1);
				}

				if (options.json) {
					switch (key) {
						case "defaultEditor":
							console.log(JSON.stringify(config.defaultEditor ?? null));
							break;
						case "projectName":
							console.log(JSON.stringify(config.projectName));
							break;
						case "defaultStatus":
							console.log(JSON.stringify(config.defaultStatus ?? ""));
							break;
						case "statuses":
							console.log(JSON.stringify(config.statuses));
							break;
						case "labels":
							console.log(JSON.stringify(config.labels));
							break;
						case "milestones": {
							const milestones = await core.filesystem.listMilestones();
							console.log(JSON.stringify(milestones.map((m) => m.id)));
							break;
						}
						case "definitionOfDone":
							console.log(JSON.stringify(config.definitionOfDone ?? []));
							break;
						case "maxColumnWidth":
							console.log(JSON.stringify(config.maxColumnWidth ?? null));
							break;
						case "defaultPort":
							console.log(JSON.stringify(config.defaultPort ?? null));
							break;
						case "autoOpenBrowser":
							console.log(JSON.stringify(config.autoOpenBrowser ?? null));
							break;
						case "remoteOperations":
							console.log(JSON.stringify(config.remoteOperations ?? null));
							break;
						case "autoCommit":
							console.log(JSON.stringify(config.autoCommit ?? null));
							break;
						case "filesystemOnly":
							console.log(JSON.stringify(config.filesystemOnly ?? false));
							break;
						case "bypassGitHooks":
							console.log(JSON.stringify(config.bypassGitHooks ?? null));
							break;
						case "zeroPaddedIds":
							console.log(JSON.stringify(config.zeroPaddedIds ?? null));
							break;
						case "checkActiveBranches":
							console.log(JSON.stringify(config.checkActiveBranches ?? true));
							break;
						case "activeBranchDays":
							console.log(JSON.stringify(config.activeBranchDays ?? 30));
							break;
						case "terminalStatuses":
							console.log(JSON.stringify(config.terminalStatuses ?? []));
							break;
						default:
							console.error(`Unknown config key: ${key}`);
							console.error(
								"Available keys: defaultEditor, projectName, defaultStatus, statuses, labels, milestones, definitionOfDone, maxColumnWidth, defaultPort, autoOpenBrowser, remoteOperations, autoCommit, filesystemOnly, bypassGitHooks, zeroPaddedIds, checkActiveBranches, activeBranchDays, terminalStatuses",
							);
							process.exit(1);
					}
					return;
				}

				switch (key) {
					case "defaultEditor":
						if (config.defaultEditor) {
							console.log(config.defaultEditor);
						} else {
							console.log("defaultEditor is not set");
							process.exit(1);
						}
						break;
					case "projectName":
						console.log(config.projectName);
						break;
					case "defaultStatus":
						console.log(config.defaultStatus || "");
						break;
					case "statuses":
						console.log(config.statuses.join(", "));
						break;
					case "labels":
						console.log(config.labels.join(", "));
						break;
					case "milestones": {
						const milestones = await core.filesystem.listMilestones();
						console.log(milestones.map((milestone) => milestone.id).join(", "));
						break;
					}
					case "definitionOfDone":
						console.log(config.definitionOfDone?.join(", ") || "");
						break;
					case "maxColumnWidth":
						console.log(config.maxColumnWidth?.toString() || "");
						break;
					case "defaultPort":
						console.log(config.defaultPort?.toString() || "");
						break;
					case "autoOpenBrowser":
						console.log(config.autoOpenBrowser?.toString() || "");
						break;
					case "remoteOperations":
						console.log(config.remoteOperations?.toString() || "");
						break;
					case "autoCommit":
						console.log(config.autoCommit?.toString() || "");
						break;
					case "filesystemOnly":
						console.log(config.filesystemOnly?.toString() || "false");
						break;
					case "bypassGitHooks":
						console.log(config.bypassGitHooks?.toString() || "");
						break;
					case "zeroPaddedIds":
						console.log(config.zeroPaddedIds?.toString() || "(disabled)");
						break;
					case "checkActiveBranches":
						console.log(config.checkActiveBranches?.toString() || "true");
						break;
					case "activeBranchDays":
						console.log(config.activeBranchDays?.toString() || "30");
						break;
					case "terminalStatuses":
						console.log(config.terminalStatuses?.join(", ") || "");
						break;
					default:
						console.error(`Unknown config key: ${key}`);
						console.error(
							"Available keys: defaultEditor, projectName, defaultStatus, statuses, labels, milestones, definitionOfDone, maxColumnWidth, defaultPort, autoOpenBrowser, remoteOperations, autoCommit, filesystemOnly, bypassGitHooks, zeroPaddedIds, checkActiveBranches, activeBranchDays, terminalStatuses",
						);
						process.exit(1);
				}
			} catch (err) {
				console.error("Failed to get config value", err);
				process.exitCode = 1;
			}
		});

	configCmd
		.command("set <key> <value>")
		.description("set a configuration value")
		.action(async (key: string, value: string) => {
			await handleConfigSetCommand(key, value);
		});

	configCmd
		.command("list")
		.description("list all configuration values")
		.option("--json", "output as JSON")
		.action(async (options) => {
			try {
				const cwd = await requireProjectRoot();
				const core = new Core(cwd);
				const config = await core.filesystem.loadConfig();

				if (!config) {
					console.error("No backlog project found. Initialize one first with: backlog init");
					process.exit(1);
				}

				if (options.json) {
					const milestones = await core.filesystem.listMilestones();
					const data = {
						projectName: config.projectName,
						defaultEditor: config.defaultEditor || null,
						defaultStatus: config.defaultStatus || null,
						statuses: config.statuses,
						labels: config.labels,
						milestones: milestones.map((m) => m.id),
						definitionOfDone: config.definitionOfDone ?? [],
						maxColumnWidth: config.maxColumnWidth ?? null,
						autoOpenBrowser: config.autoOpenBrowser ?? null,
						defaultPort: config.defaultPort ?? null,
						remoteOperations: config.remoteOperations ?? null,
						autoCommit: config.autoCommit ?? null,
						filesystemOnly: config.filesystemOnly ?? false,
						bypassGitHooks: config.bypassGitHooks ?? null,
						zeroPaddedIds: config.zeroPaddedIds ?? null,
						taskPrefix: config.prefixes?.task || "task",
						checkActiveBranches: config.checkActiveBranches ?? true,
						activeBranchDays: config.activeBranchDays ?? 30,
					};
					console.log(JSON.stringify(data, null, 2));
					return;
				}

				console.log("Configuration:");
				console.log(`  projectName: ${config.projectName}`);
				console.log(`  defaultEditor: ${config.defaultEditor || "(not set)"}`);
				console.log(`  defaultStatus: ${config.defaultStatus || "(not set)"}`);
				console.log(`  statuses: [${config.statuses.join(", ")}]`);
				console.log(`  labels: [${config.labels.join(", ")}]`);
				const milestones = await core.filesystem.listMilestones();
				console.log(`  milestones: [${milestones.map((milestone) => milestone.id).join(", ")}]`);
				console.log(`  definitionOfDone: [${(config.definitionOfDone ?? []).join(", ")}]`);
				console.log(`  maxColumnWidth: ${config.maxColumnWidth || "(not set)"}`);
				console.log(`  autoOpenBrowser: ${config.autoOpenBrowser ?? "(not set)"}`);
				console.log(`  defaultPort: ${config.defaultPort ?? "(not set)"}`);
				console.log(`  remoteOperations: ${config.remoteOperations ?? "(not set)"}`);
				console.log(`  autoCommit: ${config.autoCommit ?? "(not set)"}`);
				console.log(`  filesystemOnly: ${config.filesystemOnly ?? "false"}`);
				console.log(`  bypassGitHooks: ${config.bypassGitHooks ?? "(not set)"}`);
				console.log(`  zeroPaddedIds: ${config.zeroPaddedIds ?? "(disabled)"}`);
				console.log(`  taskPrefix: ${config.prefixes?.task || "task"} (read-only)`);
				console.log(`  checkActiveBranches: ${config.checkActiveBranches ?? "true"}`);
				console.log(`  activeBranchDays: ${config.activeBranchDays ?? "30"}`);
			} catch (err) {
				console.error("Failed to list config values", err);
				process.exitCode = 1;
			}
		});
}

async function handleConfigSetCommand(key: string, value: string) {
	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	const config = await core.filesystem.loadConfig();

	if (!config) {
		console.error("No backlog project found. Initialize one first with: backlog init");
		process.exit(1);
	}

	switch (key) {
		case "defaultEditor": {
			const { isEditorAvailable } = await import("../utils/editor.ts");
			const isAvailable = await isEditorAvailable(value);
			if (!isAvailable) {
				console.error(`Editor command not found: ${value}`);
				console.error("Please ensure the editor is installed and available in your PATH");
				process.exit(1);
			}
			config.defaultEditor = value;
			break;
		}
		case "projectName":
			config.projectName = value;
			break;
		case "defaultStatus":
			config.defaultStatus = value;
			break;
		case "maxColumnWidth": {
			const width = Number.parseInt(value, 10);
			if (Number.isNaN(width) || width <= 0) {
				console.error("maxColumnWidth must be a positive number");
				process.exit(1);
			}
			config.maxColumnWidth = width;
			break;
		}
		case "autoOpenBrowser": {
			const boolValue = value.toLowerCase();
			if (boolValue === "true" || boolValue === "1" || boolValue === "yes") {
				config.autoOpenBrowser = true;
			} else if (boolValue === "false" || boolValue === "0" || boolValue === "no") {
				config.autoOpenBrowser = false;
			} else {
				console.error("autoOpenBrowser must be true or false");
				process.exit(1);
			}
			break;
		}
		case "defaultPort": {
			const port = Number.parseInt(value, 10);
			if (Number.isNaN(port) || port < 1 || port > 65535) {
				console.error("defaultPort must be a valid port number (1-65535)");
				process.exit(1);
			}
			config.defaultPort = port;
			break;
		}
		case "remoteOperations": {
			const boolValue = value.toLowerCase();
			if (boolValue === "true" || boolValue === "1" || boolValue === "yes") {
				config.remoteOperations = true;
			} else if (boolValue === "false" || boolValue === "0" || boolValue === "no") {
				config.remoteOperations = false;
			} else {
				console.error("remoteOperations must be true or false");
				process.exit(1);
			}
			break;
		}
		case "autoCommit": {
			const boolValue = value.toLowerCase();
			if (boolValue === "true" || boolValue === "1" || boolValue === "yes") {
				config.autoCommit = true;
			} else if (boolValue === "false" || boolValue === "0" || boolValue === "no") {
				config.autoCommit = false;
			} else {
				console.error("autoCommit must be true or false");
				process.exit(1);
			}
			break;
		}
		case "filesystemOnly": {
			const boolValue = value.toLowerCase();
			if (boolValue === "true" || boolValue === "1" || boolValue === "yes") {
				config.filesystemOnly = true;
				config.checkActiveBranches = false;
				config.remoteOperations = false;
				config.autoCommit = false;
				config.bypassGitHooks = false;
			} else if (boolValue === "false" || boolValue === "0" || boolValue === "no") {
				config.filesystemOnly = false;
			} else {
				console.error("filesystemOnly must be true or false");
				process.exit(1);
			}
			break;
		}
		case "bypassGitHooks": {
			const boolValue = value.toLowerCase();
			if (boolValue === "true" || boolValue === "1" || boolValue === "yes") {
				config.bypassGitHooks = true;
			} else if (boolValue === "false" || boolValue === "0" || boolValue === "no") {
				config.bypassGitHooks = false;
			} else {
				console.error("bypassGitHooks must be true or false");
				process.exit(1);
			}
			break;
		}
		case "zeroPaddedIds": {
			const padding = Number.parseInt(value, 10);
			if (Number.isNaN(padding) || padding < 0) {
				console.error("zeroPaddedIds must be a non-negative number.");
				process.exit(1);
			}
			config.zeroPaddedIds = padding > 0 ? padding : undefined;
			break;
		}
		case "checkActiveBranches": {
			const boolValue = value.toLowerCase();
			if (boolValue === "true" || boolValue === "1" || boolValue === "yes") {
				config.checkActiveBranches = true;
			} else if (boolValue === "false" || boolValue === "0" || boolValue === "no") {
				config.checkActiveBranches = false;
			} else {
				console.error("checkActiveBranches must be true or false");
				process.exit(1);
			}
			break;
		}
		case "activeBranchDays": {
			const days = Number.parseInt(value, 10);
			if (Number.isNaN(days) || days < 0) {
				console.error("activeBranchDays must be a non-negative number.");
				process.exit(1);
			}
			config.activeBranchDays = days;
			break;
		}
		case "terminalStatuses": {
			const parsed = value
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			config.terminalStatuses = parsed.length > 0 ? parsed : undefined;
			break;
		}
		case "statuses":
		case "labels":
			console.error("Use 'backlog label add/remove' to manage labels.");
			process.exit(1);
			break;
		case "milestones":
		case "definitionOfDone":
			if (key === "milestones") {
				console.error("milestones cannot be set directly.");
				console.error(
					"Use milestone files via milestone commands (e.g. `backlog milestone list`, `backlog milestone add`).",
				);
			} else if (key === "definitionOfDone") {
				console.error("definitionOfDone cannot be set directly.");
				console.error(
					"Use `backlog config` for interactive editing, update the project config file (`backlog/config.yml`, `.backlog/config.yml`, or `backlog.config.yml`), or use Web UI Settings.",
				);
			}
			process.exit(1);
			break;
		case "taskPrefix":
		case "prefixes":
			console.error("Task prefix cannot be changed after initialization.");
			console.error("The prefix is set during 'backlog init' and is permanent to avoid breaking existing task IDs.");
			process.exit(1);
			break;
		default:
			console.error(`Unknown config key: ${key}`);
			console.error(
				"Available keys: defaultEditor, projectName, defaultStatus, maxColumnWidth, autoOpenBrowser, defaultPort, remoteOperations, autoCommit, filesystemOnly, bypassGitHooks, zeroPaddedIds, checkActiveBranches, activeBranchDays, terminalStatuses",
			);
			process.exit(1);
	}

	await core.filesystem.saveConfig(config);
	console.log(`Set ${key} = ${value}`);
}
