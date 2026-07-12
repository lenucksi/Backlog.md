import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { installClaudeAgent } from "../index.ts";
import { AppError } from "../utils/app-error.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import { CONFIG_SCHEMA_ENTRIES, CONFIG_SCHEMA_MAP, type ConfigSchemaEntry } from "../utils/config-schema.ts";
import { EXIT } from "../utils/exit-codes.ts";
import { applyOutputOptions, getOutputMode, stdout } from "../utils/output.ts";
import type { CompletionInstallResult } from "./completion.ts";
import { installCompletion } from "./completion.ts";
import { configureAdvancedSettings } from "./configure-advanced-settings.ts";

function levenshtein(a: string, b: string): number {
	if (a.length < b.length) return levenshtein(b, a);
	const n = b.length;
	const prev: number[] = [];
	for (let j = 0; j <= n; j++) prev.push(j);
	for (let i = 0; i < a.length; i++) {
		const curr: number[] = [i + 1];
		for (let j = 0; j < n; j++) {
			const cost = a[i] === b[j] ? 0 : 1;
			// biome-ignore lint/style/noNonNullAssertion: TS strict array access workaround
			const del = curr[j]! + 1;
			// biome-ignore lint/style/noNonNullAssertion: TS strict array access workaround
			const ins = prev[j + 1]! + 1;
			// biome-ignore lint/style/noNonNullAssertion: TS strict array access workaround
			const sub = prev[j]! + cost;
			curr.push(Math.min(del, ins, sub));
		}
		prev.length = 0;
		for (let j = 0; j < curr.length; j++) {
			// biome-ignore lint/style/noNonNullAssertion: TS strict array access workaround
			prev.push(curr[j]!);
		}
	}
	// biome-ignore lint/style/noNonNullAssertion: TS strict array access workaround
	return prev[n]!;
}

function fuzzySuggest(input: string, maxDistance = 3): string[] {
	const lowered = input.toLowerCase();
	return CONFIG_SCHEMA_ENTRIES.map((e) => ({ key: e.key, dist: levenshtein(lowered, e.key.toLowerCase()) }))
		.filter((s) => s.dist <= maxDistance)
		.sort((a, b) => a.dist - b.dist)
		.map((s) => s.key)
		.slice(0, 5);
}

function labelToString(label: unknown): string {
	if (typeof label === "string") return label;
	const l = label as Record<string, unknown>;
	return l.color ? `${l.name} (${l.color})` : String(l.name);
}

function authorToString(author: unknown): string {
	if (typeof author === "string") return author;
	const a = author as Record<string, unknown>;
	return a.color ? `${a.name} (${a.color})` : String(a.name);
}

function formatValue(entry: ConfigSchemaEntry, value: unknown): string {
	if (value === undefined || value === null) {
		return entry.default !== undefined ? String(entry.default) : "(not set)";
	}
	switch (entry.type) {
		case "string":
		case "number":
		case "boolean":
			return String(value);
		case "string[]":
			return Array.isArray(value) ? `[${value.join(", ")}]` : String(value);
		case "label[]":
			return Array.isArray(value) ? `[${value.map(labelToString).join(", ")}]` : String(value);
		case "author[]":
			return Array.isArray(value) ? `[${value.map(authorToString).join(", ")}]` : String(value);
		default:
			return String(value);
	}
}

function defaultDisplay(entry: ConfigSchemaEntry): string {
	if (entry.default === undefined) return "(not set)";
	if (Array.isArray(entry.default) && entry.default.length === 0) return "[]";
	return String(entry.default);
}

function formatValuePretty(entry: ConfigSchemaEntry, value: unknown): string {
	if (value === undefined || value === null) {
		return defaultDisplay(entry);
	}
	if (entry.type === "string" || entry.type === "number" || entry.type === "boolean") {
		return String(value);
	}
	if (!Array.isArray(value)) return String(value);
	const items =
		entry.type === "string[]"
			? (value as string[])
			: (value as unknown[]).map((v) => (entry.type === "author[]" ? authorToString(v) : labelToString(v)));
	const inline = `[${items.join(", ")}]`;
	if (items.length <= 5 && inline.length <= 80) {
		return inline;
	}
	return items.map((item: string) => `  - ${item}`).join("\n");
}

function formatValueShort(entry: ConfigSchemaEntry, value: unknown): string {
	if (value === undefined || value === null) return "";
	switch (entry.type) {
		case "string":
		case "number":
		case "boolean":
			return String(value);
		case "string[]":
			return Array.isArray(value) ? value.join(", ") : String(value);
		case "label[]":
			return Array.isArray(value) ? value.map(labelToString).join(", ") : String(value);
		case "author[]":
			return Array.isArray(value) ? value.map(authorToString).join(", ") : String(value);
		default:
			return String(value);
	}
}

function formatValueJson(value: unknown): string {
	if (value === undefined || value === null) return "null";
	return JSON.stringify(value);
}

function parseStringArray(rawValue: string): string[] {
	try {
		const parsed = JSON.parse(rawValue);
		if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === "string")) {
			return parsed;
		}
	} catch {
		// expected: value is not valid JSON
	}
	return rawValue
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function coerceValue(
	entry: ConfigSchemaEntry,
	rawValue: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
	try {
		let value: unknown;
		switch (entry.type) {
			case "string":
				value = rawValue;
				break;
			case "number": {
				const n = Number.parseInt(rawValue, 10);
				if (Number.isNaN(n)) return { ok: false, error: `must be a number, got: ${rawValue}` };
				value = n;
				break;
			}
			case "boolean": {
				const lower = rawValue.toLowerCase();
				if (["true", "1", "yes"].includes(lower)) {
					value = true;
				} else if (["false", "0", "no"].includes(lower)) {
					value = false;
				} else {
					return { ok: false, error: `must be true, false, 1, 0, yes, or no; got: ${rawValue}` };
				}
				break;
			}
			case "string[]":
				value = parseStringArray(rawValue);
				break;
			case "label[]":
			case "author[]":
				value = JSON.parse(rawValue);
				break;
		}
		return { ok: true, value };
	} catch (e) {
		return { ok: false, error: `invalid value: ${(e as Error).message}` };
	}
}

function getConfigValue(config: Record<string, unknown>, entry: ConfigSchemaEntry): unknown {
	if (entry.configKey === "prefixes") {
		const prefixes = config.prefixes as Record<string, unknown> | undefined;
		return prefixes?.task;
	}
	return config[entry.configKey];
}

function setConfigValue(config: Record<string, unknown>, entry: ConfigSchemaEntry, value: unknown): void {
	if (entry.configKey === "prefixes") {
		const prefixes = (config.prefixes as Record<string, unknown>) ?? {};
		prefixes.task = String(value);
		config.prefixes = prefixes;
	} else {
		config[entry.configKey] = value;
	}
}

async function loadConfigWithCheck(cwd: string): Promise<Core> {
	const core = new Core(cwd);
	const config = await core.filesystem.loadConfig();
	if (!config) {
		console.error("No backlog project found. Initialize one first with: backlog init");
		process.exit(EXIT.ERROR);
	}
	return core;
}

export function registerConfigCommand(program: Command): void {
	const configCmd = program
		.command("config")
		.description("manage backlog configuration")
		.action(async () => {
			try {
				const cwd = await requireProjectRoot();
				const core = await loadConfigWithCheck(cwd);

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

				stdout("\nAdvanced configuration updated.");
				stdout(`  Check active branches: ${mergedConfig.checkActiveBranches ?? true}`);
				stdout(`  Remote operations: ${mergedConfig.remoteOperations ?? true}`);
				stdout(
					`  Zero-padded IDs: ${
						typeof mergedConfig.zeroPaddedIds === "number" ? `${mergedConfig.zeroPaddedIds} digits` : "disabled"
					}`,
				);
				stdout(`  Web UI port: ${mergedConfig.defaultPort ?? 6420}`);
				stdout(`  Auto open browser: ${mergedConfig.autoOpenBrowser ?? true}`);
				stdout(`  Bypass git hooks: ${mergedConfig.bypassGitHooks ?? false}`);
				stdout(`  Auto commit: ${mergedConfig.autoCommit ?? false}`);
				stdout(`  Definition of Done defaults: ${(mergedConfig.definitionOfDone ?? []).join(" | ") || "(none)"}`);
				if (completionResult) {
					stdout(
						[
							"",
							`Shell completion script installed for ${completionResult.shell}.`,
							`  Path: ${completionResult.installPath}`,
							completionResult.instructions.trim(),
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
				if (mergedConfig.defaultEditor) {
					stdout(`  Default editor: ${mergedConfig.defaultEditor}`);
				}
				if (shouldInstallClaude) {
					await installClaudeAgent(cwd);
					stdout("✓ Claude Code Backlog.md agent installed to .claude/agents/");
				}
				stdout("\nUse `backlog config list` to review all configuration values.");
			} catch (err) {
				console.error("Failed to update configuration", err instanceof Error ? err.message : String(err));
				process.exitCode = 1;
			}
		});

	configCmd
		.command("get [key]")
		.description("get a configuration value")
		.option("--json", "output as JSON")
		.action(async (key: string | undefined, options) => {
			applyOutputOptions(options);
			if (!key) {
				configCmd.help();
				return;
			}
			try {
				const cwd = await requireProjectRoot();
				const core = await loadConfigWithCheck(cwd);
				const config = await core.filesystem.loadConfig();

				// Special key: milestones (derived from milestone files, not config)
				if (key === "milestones") {
					const milestones = await core.filesystem.listMilestones();
					if (getOutputMode() === "json") {
						stdout(milestones.map((m) => m.id));
					} else {
						stdout(milestones.map((m) => m.id).join(", "));
					}
					return;
				}

				const entry = CONFIG_SCHEMA_MAP.get(key);
				if (!entry) {
					const suggestions = fuzzySuggest(key);
					if (suggestions.length > 0) {
						console.error(`Unknown config key: ${key}`);
						console.error(`Meinten Sie '${suggestions[0]}'?`);
					} else {
						console.error(`Unknown config key: ${key}`);
					}
					process.exit(EXIT.ERROR);
				}

				// aislop-ignore-next-line double-type-assertion -- required per AGENTS.md
				const value = getConfigValue(config as unknown as Record<string, unknown>, entry);

				if (getOutputMode() === "json") {
					stdout(formatValueJson(value));
				} else {
					stdout(formatValueShort(entry, value));
				}
			} catch (err) {
				console.error("Failed to get config value", err instanceof Error ? err.message : String(err));
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
			applyOutputOptions(options);
			try {
				const cwd = await requireProjectRoot();
				const core = await loadConfigWithCheck(cwd);
				const config = await core.filesystem.loadConfig();

				if (getOutputMode() === "json") {
					const raw = await core.filesystem.loadRawConfig();
					const milestones = await core.filesystem.listMilestones();
					const data: Record<string, unknown> = {};
					if (raw) {
						for (const [k, v] of Object.entries(raw)) {
							data[k] = v;
						}
					}
					data.milestones = milestones.map((m) => m.id);
					stdout(data);
					return;
				}

				// aislop-ignore-next-line double-type-assertion -- required per AGENTS.md
				const configRecord = config as unknown as Record<string, unknown>;

				for (const entry of CONFIG_SCHEMA_ENTRIES) {
					const value = getConfigValue(configRecord, entry);
					const formatted = formatValuePretty(entry, value);
					const readOnlyTag = entry.readOnly ? " (read-only)" : "";
					if (formatted.startsWith("  - ")) {
						stdout(`${entry.key}:`);
						stdout(formatted);
					} else {
						stdout(`${entry.key}: ${formatted}${readOnlyTag}`);
					}
				}

				// Milestones: derived from files, not config
				const milestones = await core.filesystem.listMilestones();
				if (milestones.length <= 5) {
					stdout(`milestones: [${milestones.map((m) => m.id).join(", ")}]`);
				} else {
					stdout("milestones:");
					for (const m of milestones) stdout(`  - ${m.id}`);
				}

				const raw = await core.filesystem.loadRawConfig();
				if (raw) {
					const unknownKeys = Object.keys(raw).filter((k) => !CONFIG_SCHEMA_MAP.has(k) && k !== "dod_defaults");
					if (unknownKeys.length > 0) {
						stdout("");
						stdout(`⚠  Unknown YAML keys in config.yml: ${unknownKeys.join(", ")}`);
						stdout("   These keys are preserved on save but not recognized by the internal model.");
					}
				}
			} catch (err) {
				console.error("Failed to list config values", err instanceof Error ? err.message : String(err));
				process.exitCode = 1;
			}
		});
}

async function handleConfigSetCommand(key: string, value: string) {
	// Validate: key must exist in schema
	const entry = CONFIG_SCHEMA_MAP.get(key);
	if (!entry) {
		const suggestions = fuzzySuggest(key);
		if (suggestions.length > 0) {
			console.error(`Unknown config key: ${key}`);
			console.error(`Meinten Sie '${suggestions[0]}'?`);
		} else {
			console.error(`Unknown config key: ${key}`);
			console.error(`Available keys: ${CONFIG_SCHEMA_ENTRIES.map((e) => e.key).join(", ")}`);
		}
		process.exit(EXIT.ERROR);
	}

	if (entry.readOnly) {
		console.error(`Config key '${key}' is read-only.`);
		console.error(entry.description);
		process.exit(EXIT.ERROR);
	}

	if (entry.rejectMessage) {
		console.error(entry.rejectMessage);
		process.exit(EXIT.ERROR);
	}

	// Coerce and validate
	const coerced = coerceValue(entry, value);
	if (!coerced.ok) {
		console.error(`Invalid value for '${key}': ${coerced.error}`);
		process.exit(EXIT.ERROR);
	}

	if (entry.validate) {
		const validationError = await entry.validate(coerced.value);
		if (validationError) {
			console.error(`Invalid value for '${key}': ${validationError}`);
			process.exit(EXIT.ERROR);
		}
	}

	const cwd = await requireProjectRoot();
	const core = await loadConfigWithCheck(cwd);
	const config = await core.filesystem.loadConfig();
	if (!config) {
		console.error("No backlog project found. Initialize one first with: backlog init");
		process.exit(EXIT.ERROR);
	}
	// aislop-ignore-next-line double-type-assertion -- required per AGENTS.md
	const configRecord = config as unknown as Record<string, unknown>;

	setConfigValue(configRecord, entry, coerced.value);

	// Side-effect: filesystemOnly true disables Git integrations
	if (entry.configKey === "filesystemOnly" && coerced.value === true) {
		config.checkActiveBranches = false;
		config.remoteOperations = false;
		config.autoCommit = false;
		config.bypassGitHooks = false;
	}

	await core.filesystem.saveConfig(config);
	const displayValue = formatValue(entry, coerced.value);
	stdout(`Set ${key} = ${displayValue}`);
}
