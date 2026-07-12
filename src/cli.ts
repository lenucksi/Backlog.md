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
import { registerTui2Command } from "./commands/tui2.ts";
import { Core } from "./core/backlog.ts";
import { setExplicitProjectPath } from "./utils/cli-context.ts";
import { EXIT } from "./utils/exit-codes.ts";
import { findBacklogRoot } from "./utils/find-backlog-root.ts";
import { resolveRuntimeCwd } from "./utils/runtime-cwd.ts";
import { getVersion } from "./utils/version.ts";

process.on("SIGINT", () => {
	process.exit(EXIT.SIGINT);
});

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

const version = await getVersion();

// Config migration hook - runs via Commander before each command action.
// This replaces the old top-level migration block that ran before program.parseAsync().
// Skipped for the init command (project doesn't exist yet) and for the
// program's own default action (splash screen).
async function runConfigMigration(thisCommand: Command, actionCommand: Command): Promise<void> {
	if (thisCommand === actionCommand || actionCommand.name() === "init") {
		return;
	}

	try {
		const rootPath = thisCommand.opts().path;
		let projectRoot: string | null;
		if (rootPath) {
			setExplicitProjectPath(rootPath);
			projectRoot = rootPath;
		} else {
			const runtimeCwd = await resolveRuntimeCwd();
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
	.option("--plain", "Force plain text output (no color, no fancy formatting)")
	.hook("preAction", runConfigMigration)
	.action(async () => {
		const opts = program.opts();
		const isTTY = !!process.stdout.isTTY;
		const forcePlain = !!opts.plain;
		const noColor = !!process.env.NO_COLOR || !isTTY;

		let initialized = false;
		try {
			const rootPath = opts.path;
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
		process.exit(EXIT.SUCCESS);
	});

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
registerTui2Command(program);

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
