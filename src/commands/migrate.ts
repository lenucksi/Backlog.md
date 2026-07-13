import { basename } from "node:path";
import * as clack from "@clack/prompts";
import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import { EXIT } from "../utils/exit-codes.ts";
import { stdout } from "../utils/output.ts";

export function registerMigrateCommand(program: Command): void {
	const migrateCommand = program.command("migrate").description("migrate backlog directory structure");

	migrateCommand
		.command("archive-structure")
		.description("migrate tasks from backlog/completed/ to backlog/archive/tasks/")
		.option("-f, --force", "execute without confirmation prompt")
		.option("--no-git", "skip git staging and commit")
		.action(async (options: { force?: boolean; git?: boolean }) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);

			const config = await core.filesystem.loadConfig();
			if (!config) {
				console.error("No backlog project found. Initialize one first with: backlog init");
				process.exit(EXIT.ERROR);
			}
			core.gitOps.setConfig(config);

			// aislop-ignore-next-line narrative-comment -- section separator
			const completedDir = core.filesystem.completedDir;
			const archiveDir = core.filesystem.archiveTasksDir;

			const oldTasks = await core.filesystem.listOldCompletedDirTasks();

			if (oldTasks.length === 0) {
				stdout("No tasks found in backlog/completed/. Nothing to migrate.");
				return;
			}

			const archivedFiles = new Set<string>();
			try {
				const archivedTasks = await core.filesystem.listArchivedTasks();
				for (const t of archivedTasks) {
					if (t.filePath) archivedFiles.add(basename(t.filePath));
				}
			} catch {
				// ignore
			}

			const inArchive: string[] = [];
			const toMigrate: string[] = [];
			const seen = new Set<string>();
			for (const task of oldTasks) {
				if (!task.filePath) continue;
				const fname = basename(task.filePath);
				if (seen.has(fname)) continue;
				seen.add(fname);
				if (archivedFiles.has(fname)) {
					inArchive.push(fname);
				} else {
					toMigrate.push(fname);
				}
			}

			stdout("");
			stdout("  Archive Structure Migration");
			stdout("  ─────────────────────────────");
			stdout(`  Source:   backlog/completed/ (${oldTasks.length} task files)`);
			stdout("  Target:   backlog/archive/tasks/");
			stdout(`  Conflicts: ${inArchive.length}`);
			stdout(`  To migrate: ${toMigrate.length}`);
			stdout("");

			if (toMigrate.length === 0 && inArchive.length === 0) {
				stdout("Nothing to migrate.");
				return;
			}

			if (toMigrate.length > 0) {
				stdout("  Tasks to migrate:");
				const showCount = Math.min(toMigrate.length, 10);
				for (let i = 0; i < showCount; i++) {
					stdout(`    ${toMigrate[i]}`);
				}
				if (toMigrate.length > 10) {
					stdout(`    ... and ${toMigrate.length - 10} more`);
				}
			}

			if (inArchive.length > 0) {
				stdout(`  ${inArchive.length} file(s) already exist in archive/tasks/ — will be skipped.`);
			}

			stdout("");

			// aislop-ignore-next-line narrative-comment -- section separator
			const shouldProceed =
				options.force ??
				(await clack.confirm({
					message: `Migrate ${toMigrate.length} tasks from backlog/completed/ to backlog/archive/tasks/?`,
					initialValue: false,
				})) === true;

			if (!shouldProceed) {
				stdout("Migration cancelled.");
				return;
			}

			const result = await core.filesystem.migrateCompletedTasks();

			stdout(`Successfully migrated ${result.migrated} of ${result.total} tasks.`);

			if (result.migrated > 0) {
				const hasGitRepository = await core.gitOps.isRepository();
				const shouldAutoCommit = config.autoCommit ?? false;

				if (hasGitRepository && options.git !== false && !shouldAutoCommit) {
					stdout("Staging file moves for Git...");
					try {
						await core.gitOps.stageFileMove(completedDir, archiveDir);
						stdout("Files staged.");
						if (!shouldAutoCommit) {
							stdout("To commit: git commit -m 'backlog: migrate completed/ to archive/tasks/'");
						}
					} catch (error) {
						console.warn(`Warning: Could not stage Git moves: ${error}`);
					}
				}
			}
		});
}
