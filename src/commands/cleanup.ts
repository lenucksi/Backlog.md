import { basename, join } from "node:path";
import * as clack from "@clack/prompts";
import type { Command } from "commander";
import { DEFAULT_STATUSES } from "../constants/index.ts";
import { Core } from "../core/backlog.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
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
				process.exit(1);
			}
			core.gitOps.setConfig(config);

			const statuses = config.statuses ?? [...DEFAULT_STATUSES];
			const terminalStatus = getTerminalStatus(statuses);
			if (!terminalStatus) {
				console.log("No terminal status configured for cleanup.");
				return;
			}

			const tasks = await core.queryTasks();
			const terminalStatusTasks = tasks.filter((task) => isTerminalStatus(task.status, statuses));

			if (terminalStatusTasks.length === 0) {
				console.log(`No ${terminalStatus} tasks found to clean up.`);
				return;
			}

			console.log(`Found ${terminalStatusTasks.length} tasks marked as ${terminalStatus}.`);

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
				console.log("Cleanup cancelled.");
				return;
			}

			const tasksToMove = await core.getTerminalStatusTasksByAge(selectedAge);

			if (tasksToMove.length === 0) {
				console.log(`No tasks found that are older than ${ageOptions.find((o) => o.value === selectedAge)?.title}.`);
				return;
			}

			console.log(
				`\nFound ${tasksToMove.length} tasks older than ${ageOptions.find((o) => o.value === selectedAge)?.title}:`,
			);
			for (const task of tasksToMove.slice(0, 5)) {
				const date = task.updatedDate || task.createdDate;
				console.log(`  - ${task.id}: ${task.title} (${date})`);
			}
			if (tasksToMove.length > 5) {
				console.log(`  ... and ${tasksToMove.length - 5} more`);
			}

			const confirmedPrompt = await clack.confirm({
				message: `Move ${tasksToMove.length} tasks to completed folder?`,
				initialValue: false,
			});
			const confirmed = clack.isCancel(confirmedPrompt) ? false : confirmedPrompt;

			if (!confirmed) {
				console.log("Cleanup cancelled.");
				return;
			}

			let successCount = 0;
			const shouldAutoCommit = config.autoCommit ?? false;

			console.log("Moving tasks...");
			const movedTasks: Array<{ fromPath: string; toPath: string; taskId: string }> = [];

			for (const task of tasksToMove) {
				const fromPath = task.filePath ?? (await core.getTask(task.id))?.filePath ?? null;

				if (!fromPath) {
					console.error(`Failed to locate file for task ${task.id}`);
					continue;
				}

				const taskFilename = basename(fromPath);
				const toPath = join(core.filesystem.completedDir, taskFilename);

				const success = await core.completeTask(task.id);
				if (success) {
					successCount++;
					movedTasks.push({ fromPath, toPath, taskId: task.id });
				} else {
					console.error(`Failed to move task ${task.id}`);
				}
			}

			const hasGitRepository = await core.gitOps.isRepository();
			if (successCount > 0 && !shouldAutoCommit && hasGitRepository) {
				console.log("Staging file moves for Git...");
				for (const { fromPath, toPath } of movedTasks) {
					try {
						await core.gitOps.stageFileMove(fromPath, toPath);
					} catch (error) {
						console.warn(`Warning: Could not stage move for Git: ${error}`);
					}
				}
			}

			console.log(`Successfully moved ${successCount} of ${tasksToMove.length} tasks to completed folder.`);
			if (successCount > 0 && !shouldAutoCommit && hasGitRepository) {
				console.log("Files have been staged. To commit: git commit -m 'cleanup: Move completed tasks'");
			}
		});
}
