import * as clack from "@clack/prompts";
import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import type { AgentInstructionFile } from "../index.ts";
import { addAgentInstructions } from "../index.ts";
import { AppError } from "../utils/app-error.ts";
import { findBacklogRoot } from "../utils/find-backlog-root.ts";
import type { RuntimeCwdResolution } from "../utils/runtime-cwd.ts";
import { resolveRuntimeCwd } from "../utils/runtime-cwd.ts";

export function registerAgentsCommand(program: Command): void {
	const agentsCmd = program.command("agents");

	agentsCmd
		.description("manage agent instruction files")
		.option(
			"--update-instructions",
			"update agent instruction files (CLAUDE.md, AGENTS.md, GEMINI.md, .github/copilot-instructions.md)",
		)
		.action(async (options) => {
			if (!options.updateInstructions) {
				agentsCmd.help();
				return;
			}
			try {
				let runtimeCwd: RuntimeCwdResolution;
				try {
					runtimeCwd = await resolveRuntimeCwd();
				} catch (error) {
					const message = AppError.formatCLIError(error);
					console.error(message);
					process.exit(1);
				}
				const cwd = (await findBacklogRoot(runtimeCwd.cwd)) ?? runtimeCwd.cwd;
				const core = new Core(cwd);

				const config = await core.filesystem.loadConfig();
				if (!config) {
					console.error("No backlog project found. Initialize one first with: backlog init");
					process.exit(1);
				}

				const selected = await clack.multiselect({
					message: "Select agent instruction files to update (space toggles selections; enter confirms)",
					required: false,
					options: [
						{ label: "CLAUDE.md (Claude Code)", value: "CLAUDE.md" },
						{
							label: "AGENTS.md (Codex, Jules, Amp, Cursor, Zed, Warp, Aider, GitHub, RooCode)",
							value: "AGENTS.md",
						},
						{ label: "GEMINI.md (Google CLI)", value: "GEMINI.md" },
						{ label: "Copilot (GitHub Copilot)", value: ".github/copilot-instructions.md" },
					],
				});
				if (clack.isCancel(selected)) {
					clack.log.info("Agent instruction update cancelled.");
					return;
				}

				const files: AgentInstructionFile[] = Array.isArray(selected) ? (selected as AgentInstructionFile[]) : [];
				if (files.length > 0) {
					const config = await core.filesystem.loadConfig();
					const shouldAutoCommit = config?.autoCommit ?? false;
					await addAgentInstructions(cwd, core.gitOps, files, shouldAutoCommit);
					console.log(`Updated ${files.length} agent instruction file(s): ${files.join(", ")}`);
				} else {
					console.log("No files selected for update.");
				}
			} catch (err) {
				console.error("Failed to update agent instructions", err);
				process.exitCode = 1;
			}
		});
}
