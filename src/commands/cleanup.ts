import { basename, join } from "node:path";
import * as clack from "@clack/prompts";
import type { Command } from "commander";
import { DEFAULT_STATUSES } from "../constants/index.ts";
import { Core } from "../core/backlog.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import { EXIT } from "../utils/exit-codes.ts";
import { stdout } from "../utils/output.ts";
import { getTerminalStatus, isTerminalStatus } from "../utils/terminal-status.ts";

export function registerCleanupCommand(program: Command): void {
	program
		.command("cleanup")
		.description("move completed tasks to completed folder based on age")
		.action(async () => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);

			const config = await core.filesystem.loadConfig();
			if (!config) {
				console.error("No backlog project found. Initialize one first with: backlog init");
				process.exit(EXIT.ERROR);
			}
			core.gitOps.setConfig(config);

			const statuses = config.statuses ?? [...DEFAULT_STATUSES];
			const terminalStatus = getTerminalStatus(statuses);
			if (!terminalStatus) {
				stdout("No terminal status configured for cleanup.");
				return;
			}

			const tasks = await core.queryTasks();
			const terminalStatusTasks = tasks.filter((task) => isTerminalStatus(task.status, statuses));

			if (terminalStatusTasks.length === 0) {
				stdout(`No ${terminalStatus} tasks found to clean up.`);
				return;
			}

			stdout(`Found ${terminalStatusTasks.length} tasks marked as ${terminalStatus}.`);

			const ageOptions = [
				{ title: "1 day", value: 1 },
				{ title: "1 week", value: 7 },
				{ title: "2 weeks", value: 14 },
				{ title: "3 weeks", value: 21 },
				{ title: "1 month", value: 30 },
				{ title: "3 months", value: 90 },
				{ title: "1 year", value: 365 },
			];

			const selectedAgePrompt = await clack.select({
				message: "Move tasks to completed folder if they are older than:",
				options: ageOptions.map((option) => ({ label: option.title, value: option.value })),
			});
			const selectedAge = clack.isCancel(selectedAgePrompt) ? undefined : selectedAgePrompt;

			if (selectedAge === undefined) {
				stdout("Cleanup cancelled.");
				return;
			}

			const tasksToMove = await core.getTerminalStatusTasksByAge(selectedAge);

			if (tasksToMove.length === 0) {
				stdout(`No tasks found that are older than ${ageOptions.find((o) => o.value === selectedAge)?.title}.`);
				return;
			}

			stdout(
				`\nFound ${tasksToMove.length} tasks older than ${ageOptions.find((o) => o.value === selectedAge)?.title}:`,
			);
			for (const task of tasksToMove.slice(0, 5)) {
				const date = task.updatedDate || task.createdDate;
				stdout(`  - ${task.id}: ${task.title} (${date})`);
			}
			if (tasksToMove.length > 5) {
				stdout(`  ... and ${tasksToMove.length - 5} more`);
			}

			const confirmedPrompt = await clack.confirm({
				message: `Move ${tasksToMove.length} tasks to completed folder?`,
				initialValue: false,
			});
			const confirmed = clack.isCancel(confirmedPrompt) ? false : confirmedPrompt;

			if (!confirmed) {
				stdout("Cleanup cancelled.");
				return;
			}

			let successCount = 0;
			const shouldAutoCommit = config.autoCommit ?? false;

			stdout("Moving tasks...");
			const movedTasks: Array<{ fromPath: string; toPath: string; taskId: string }> = [];

			for (const task of tasksToMove) {
				const fromPath = task.filePath ?? (await core.getTask(task.id))?.filePath ?? null;

				if (!fromPath) {
					console.error(`Failed to locate file for task ${task.id}`);
					continue;
				}

				const taskFilename = basename(fromPath);
				const toPath = join(core.filesystem.archiveTasksDir, taskFilename);

				const success = await core.archiveTask(task.id);
				if (success) {
					successCount++;
					movedTasks.push({ fromPath, toPath, taskId: task.id });
				} else {
					console.error(`Failed to move task ${task.id}`);
				}
			}

			const hasGitRepository = await core.gitOps.isRepository();
			if (successCount > 0 && !shouldAutoCommit && hasGitRepository) {
				stdout("Staging file moves for Git...");
				for (const { fromPath, toPath } of movedTasks) {
					try {
						await core.gitOps.stageFileMove(fromPath, toPath);
					} catch (error) {
						console.warn(`Warning: Could not stage move for Git: ${error}`);
					}
				}
			}

			stdout(`Successfully moved ${successCount} of ${tasksToMove.length} tasks to completed folder.`);
			if (successCount > 0 && !shouldAutoCommit && hasGitRepository) {
				stdout("Files have been staged. To commit: git commit -m 'cleanup: Move completed tasks'");
			}
		});
}
