#!/usr/bin/env node

import { Command } from "commander";
import { registerAgentsCommand } from "./commands/agents.ts";
import { registerAuthorCommand } from "./commands/author.ts";
import { registerBoardCommand } from "./commands/board.ts";
import { registerBrowserCommand } from "./commands/browser.ts";
import { registerCleanupCommand } from "./commands/cleanup.ts";
import { registerCompletionCommand } from "./commands/completion.ts";
import { registerConfigCommand } from "./commands/config.ts";
import { registerDecisionCommand } from "./commands/decision.ts";
import { registerDocCommand } from "./commands/doc.ts";
import { registerDraftCommand } from "./commands/draft.ts";
import { registerInitCommand } from "./commands/init.ts";
import { registerInstructionsCommand } from "./commands/instructions.ts";
import { registerLabelCommand } from "./commands/label.ts";
import { registerMcpCommand } from "./commands/mcp.ts";
import { registerMigrateCommand } from "./commands/migrate.ts";
import { registerMilestoneCommand } from "./commands/milestone.ts";
import { registerOpenCommand } from "./commands/open.ts";
import { registerOverviewCommand } from "./commands/overview.ts";
import { registerSearchCommand } from "./commands/search.ts";
import { registerSequenceCommand } from "./commands/sequence.ts";
import { registerStatsCommand } from "./commands/statistics.ts";
import { registerTaskCommand } from "./commands/task.ts";
import { Core } from "./core/backlog.ts";
import { getExplicitProjectPath, setExplicitProjectPath } from "./utils/cli-context.ts";
import { findBacklogRoot } from "./utils/find-backlog-root.ts";
import { resolveRuntimeCwd } from "./utils/runtime-cwd.ts";
import { getVersion } from "./utils/version.ts";

// Windows color fix
if (process.platform === "win32") {
	const term = process.env.TERM;
	if (!term || /^(xterm|dumb|ansi|vt100)$/i.test(term)) {
		process.env.TERM = "xterm-256color";
	}
}

// Temporarily isolate BUN_OPTIONS during CLI parsing to prevent conflicts
const originalBunOptions = process.env.BUN_OPTIONS;
if (process.env.BUN_OPTIONS) {
	delete process.env.BUN_OPTIONS;
}

// Get version from package.json
const version = await getVersion();

// Frühzeitige argv-Parsing für --path und --cwd (vor Commander-Init nötig)
// Commander registriert diese Optionen ebenfalls. Die Duplizierung ist bewusst:
// Splash-Screen (Zeile 124) und Config-Migration (Zeile 165) laufen BEVOR
// program.parseAsync() aufgerufen wird. Sobald diese Pre-Init-Logik entfällt,
// können diese Funktionen entfernt werden.
function getPathOverrideFromArgv(argv = process.argv): string | undefined {
	const args = argv.slice(2);
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg || arg.startsWith("-") === false) {
			continue;
		}
		if (arg === "--path") {
			const next = args[i + 1]?.trim();
			if (next && !next.startsWith("-")) {
				return next || undefined;
			}
		}
		if (arg?.startsWith("--path=")) {
			const value = arg.slice("--path=".length).trim();
			return value || undefined;
		}
	}
	return undefined;
}

function getMcpStartCwdOverrideFromArgv(argv = process.argv): string | undefined {
	const args = argv.slice(2);
	const mcpIndex = args.indexOf("mcp");
	if (mcpIndex < 0 || args[mcpIndex + 1] !== "start") {
		return undefined;
	}

	for (let i = mcpIndex + 2; i < args.length; i++) {
		const arg = args[i];
		if (!arg) {
			continue;
		}
		if (arg === "--cwd") {
			const next = args[i + 1]?.trim();
			return next || undefined;
		}
		if (arg?.startsWith("--cwd=")) {
			const value = arg.slice("--cwd=".length).trim();
			return value || undefined;
		}
	}

	return undefined;
}

// Parse --path from argv early for use in splash screen and config migration
const explicitPath = getPathOverrideFromArgv();
if (explicitPath) {
	setExplicitProjectPath(explicitPath);
}

// Bare-run splash screen handling (before Commander parses commands)
try {
	let rawArgs = process.argv.slice(2);
	if (rawArgs.length > 0) {
		const first = rawArgs[0];
		if (
			typeof first === "string" &&
			/node_modules[\\/]+backlog\.md-(darwin|linux|windows)-[^\\/]+[\\/]+backlog(\.exe)?$/.test(first)
		) {
			rawArgs = rawArgs.slice(1);
		}
	}
	const wantsHelp = rawArgs.includes("-h") || rawArgs.includes("--help");
	const wantsVersion = rawArgs.includes("-v") || rawArgs.includes("--version");
	const onlyPlain = rawArgs.length === 1 && rawArgs[0] === "--plain";
	const isBare = rawArgs.length === 0 || onlyPlain;
	if (isBare && !wantsHelp && !wantsVersion) {
		const isTTY = !!process.stdout.isTTY;
		const forcePlain = rawArgs.includes("--plain");
		const noColor = !!process.env.NO_COLOR || !isTTY;

		let initialized = false;
		try {
			const rootPath = getExplicitProjectPath();
			const projectRoot = rootPath ?? (await findBacklogRoot((await resolveRuntimeCwd()).cwd));
			if (projectRoot) {
				const core = new Core(projectRoot);
				const cfg = await core.filesystem.loadConfig();
				initialized = !!cfg;
			}
		} catch {
			initialized = false;
		}

		const { printSplash } = await import("./ui/splash.ts");
		const termWidth = Math.max(0, Number(process.stdout.columns || 0));
		const autoPlain = !isTTY || (termWidth > 0 && termWidth < 60);
		await printSplash({
			version,
			initialized,
			plain: forcePlain || autoPlain,
			color: !noColor,
		});
		process.exit(0);
	}
} catch {
	// Fall through to normal CLI parsing on any splash error
}

// Global config migration - run before any command processing
const shouldRunMigration =
	!process.argv.includes("init") &&
	!process.argv.includes("--help") &&
	!process.argv.includes("-h") &&
	!process.argv.includes("--version") &&
	!process.argv.includes("-v") &&
	process.argv.length > 2;

if (shouldRunMigration) {
	try {
		const rootPath = getExplicitProjectPath();
		let projectRoot: string | null;
		if (rootPath) {
			projectRoot = rootPath;
		} else {
			const runtimeCwd = await resolveRuntimeCwd({ cwd: getMcpStartCwdOverrideFromArgv() });
			projectRoot = await findBacklogRoot(runtimeCwd.cwd);
		}
		if (projectRoot) {
			const core = new Core(projectRoot);
			const config = await core.filesystem.loadConfig();
			if (config) {
				await core.ensureConfigMigrated();
			}
		}
	} catch {
		// Silently ignore migration errors
	}
}

const program = new Command();
program
	.name("backlog")
	.description("Backlog.md - Project management CLI")
	.version(version, "-v, --version", "display version number")
	.option("--path <path>", "Path to the Backlog.md project root (overrides auto-detection)")
	.option("--cwd <path>", "Working directory for MCP start command");

// Register all command groups
registerInitCommand(program);
registerAuthorCommand(program);
registerLabelCommand(program);
registerTaskCommand(program);
registerSearchCommand(program);
registerDraftCommand(program);
registerMilestoneCommand(program);
registerBoardCommand(program, version);
registerDocCommand(program);
registerDecisionCommand(program);
registerAgentsCommand(program);
registerConfigCommand(program);
registerSequenceCommand(program);
registerStatsCommand(program);
registerCleanupCommand(program);
registerBrowserCommand(program);
registerOverviewCommand(program);
registerOpenCommand(program);
registerCompletionCommand(program);
registerMcpCommand(program);
registerMigrateCommand(program);
registerInstructionsCommand(program);

program.addHelpText(
	"afterAll",
	`
LLM AGENTS:
  Run 'backlog instructions' for detailed workflow guidance.
  Example: backlog instructions overview
`,
);

program.parseAsync(process.argv).finally(() => {
	if (originalBunOptions) {
		process.env.BUN_OPTIONS = originalBunOptions;
	}
});
