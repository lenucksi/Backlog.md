import type { Command } from "commander";
import { DEFAULT_STATUSES } from "../constants/index.ts";
import { Core } from "../core/backlog.ts";
import { computeSequences } from "../core/sequences.ts";
import { isPlainRequested, requireProjectRoot, shouldAutoPlain } from "../utils/cli-context.ts";
import { isTerminalStatus } from "../utils/terminal-status.ts";

export function registerSequenceCommand(program: Command): void {
	const sequenceCmd = program.command("sequence");

	sequenceCmd
		.description("list and inspect execution sequences computed from task dependencies")
		.command("list")
		.description("list sequences (interactive by default; use --plain for text output)")
		.option("--plain", "use plain text output instead of interactive UI")
		.action(async (options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const tasks = await core.queryTasks();
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses ?? [...DEFAULT_STATUSES];
			const activeTasks = tasks.filter((t) => !isTerminalStatus(t.status, statuses, config?.terminalStatuses));
			const { unsequenced, sequences } = computeSequences(activeTasks);

			const usePlainOutput = isPlainRequested(options) || shouldAutoPlain;
			if (usePlainOutput) {
				if (unsequenced.length > 0) {
					console.log("Unsequenced:");
					for (const t of unsequenced) {
						console.log(`  ${t.id} - ${t.title}`);
					}
					console.log("");
				}
				for (const seq of sequences) {
					console.log(`Sequence ${seq.index}:`);
					for (const t of seq.tasks) {
						console.log(`  ${t.id} - ${t.title}`);
					}
					console.log("");
				}
				return;
			}

			const { runSequencesView } = await import("../ui/sequences.ts");
			await runSequencesView({ unsequenced, sequences }, core);
		});
}
