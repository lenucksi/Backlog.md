import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { buildMilestoneBuckets, collectArchivedMilestoneKeys } from "../core/milestones.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";

export function registerMilestoneCommand(program: Command): void {
	const milestoneCmd = program.command("milestone").aliases(["milestones"]);

	milestoneCmd
		.command("list")
		.description("list milestones with completion status")
		.option("--show-completed", "show completed milestones")
		.option("--plain", "use plain text output")
		.action(async (options: { showCompleted?: boolean; plain?: boolean }) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();

			const [tasks, milestones, archivedMilestones, config] = await Promise.all([
				core.queryTasks({ includeCrossBranch: false }),
				core.filesystem.listMilestones(),
				core.filesystem.listArchivedMilestones(),
				core.filesystem.loadConfig(),
			]);

			const statuses = config?.statuses ?? ["To Do", "In Progress", "Done"];
			const archivedMilestoneIds = collectArchivedMilestoneKeys(archivedMilestones, milestones);
			const buckets = buildMilestoneBuckets(tasks, milestones, statuses, {
				archivedMilestoneIds,
				archivedMilestones,
				terminalStatuses: config?.terminalStatuses,
			});
			const active = buckets.filter((bucket) => !bucket.isNoMilestone && !bucket.isCompleted);
			const completed = buckets.filter((bucket) => !bucket.isNoMilestone && bucket.isCompleted);

			const formatBucket = (bucket: (typeof buckets)[number]) => {
				const id = bucket.milestone ?? bucket.label;
				const label = bucket.label;
				return `  ${id}: ${label} (${bucket.doneCount}/${bucket.total} done)`;
			};

			console.log(`Active milestones (${active.length}):`);
			if (active.length === 0) {
				console.log("  (none)");
			} else {
				for (const bucket of active) {
					console.log(formatBucket(bucket));
				}
			}

			console.log(`\nCompleted milestones (${completed.length}):`);
			if (completed.length === 0) {
				console.log("  (none)");
			} else if (options.showCompleted || process.argv.includes("--show-completed")) {
				for (const bucket of completed) {
					console.log(formatBucket(bucket));
				}
			} else {
				console.log("  (collapsed, use --show-completed to list)");
			}
		});

	milestoneCmd
		.command("archive <name>")
		.description("archive a milestone by id or title")
		.action(async (name: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const result = await core.archiveMilestone(name);

			if (!result.success) {
				console.error(`Milestone "${name}" not found.`);
				process.exitCode = 1;
				return;
			}

			const label = result.milestone?.title ?? name;
			const id = result.milestone?.id;
			console.log(`Archived milestone "${label}"${id ? ` (${id})` : ""}.`);
		});
}
