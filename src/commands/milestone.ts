import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import {
	buildMilestoneBuckets,
	collectArchivedMilestoneKeys,
	milestoneKey,
	normalizeMilestoneName,
} from "../core/milestones.ts";
import type { Milestone } from "../types/index.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";

function findMilestoneByAlias(
	name: string,
	milestones: Milestone[],
): Milestone | undefined {
	const normalized = normalizeMilestoneName(name);
	if (!normalized) return undefined;
	const key = milestoneKey(normalized);
	return milestones.find(
		(m) => milestoneKey(m.id) === key || milestoneKey(m.title) === key,
	);
}

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
		.command("create <name>")
		.description("create a new milestone")
		.option("-d, --description <text>", "description for the milestone")
		.action(async (name: string, options: { description?: string }) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();

			const normalizedName = normalizeMilestoneName(name);
			if (!normalizedName) {
				console.error("Milestone name cannot be empty.");
				process.exitCode = 1;
				return;
			}

			const existing = await core.filesystem.listMilestones();
			const nameKey = milestoneKey(normalizedName);
			const duplicate = existing.find(
				(m) => milestoneKey(m.id) === nameKey || milestoneKey(m.title) === nameKey,
			);
			if (duplicate) {
				console.error(
					`Milestone "${normalizedName}" already exists (${duplicate.id}: ${duplicate.title}).`,
				);
				process.exitCode = 1;
				return;
			}

			const milestone = await core.filesystem.createMilestone(normalizedName, options.description);
			console.log(`Created milestone "${milestone.title}" (${milestone.id}).`);
		});

	milestoneCmd
		.command("rename <old-name> <new-name>")
		.description("rename a milestone and update referencing tasks")
		.action(async (oldName: string, newName: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();

			const normalizedOld = normalizeMilestoneName(oldName);
			const normalizedNew = normalizeMilestoneName(newName);
			if (!normalizedOld || !normalizedNew) {
				console.error("Milestone name cannot be empty.");
				process.exitCode = 1;
				return;
			}

			const milestones = await core.filesystem.listMilestones();
			const sourceMilestone = findMilestoneByAlias(normalizedOld, milestones);
			if (!sourceMilestone) {
				console.error(`Milestone "${oldName}" not found.`);
				process.exitCode = 1;
				return;
			}

			const targetKey = milestoneKey(normalizedNew);
			const aliasConflict = milestones.find(
				(m) =>
					milestoneKey(m.id) !== milestoneKey(sourceMilestone.id) &&
					(milestoneKey(m.id) === targetKey || milestoneKey(m.title) === targetKey),
			);
			if (aliasConflict) {
				console.error(
					`Milestone "${normalizedNew}" conflicts with existing milestone "${aliasConflict.title}" (${aliasConflict.id}).`,
				);
				process.exitCode = 1;
				return;
			}

			const renameResult = await core.renameMilestone(sourceMilestone.id, normalizedNew, false);
			if (!renameResult.success || !renameResult.milestone) {
				console.error(`Failed to rename milestone "${sourceMilestone.title}".`);
				process.exitCode = 1;
				return;
			}

			const renamedMilestone = renameResult.milestone;
			const tasks = await core.filesystem.listTasks();
			const oldKey = milestoneKey(sourceMilestone.title);
			const idKey = milestoneKey(sourceMilestone.id);
			const matchingTasks = tasks.filter((task) => {
				if (!task.milestone) return false;
				const taskKey = milestoneKey(task.milestone);
				return taskKey === oldKey || taskKey === idKey;
			});

			const updatedIds: string[] = [];
			for (const task of matchingTasks) {
				try {
					await core.editTask(task.id, { milestone: renamedMilestone.id }, false);
					updatedIds.push(task.id);
				} catch (error) {
					console.error(`Failed to update task ${task.id}: ${error}`);
				}
			}

			console.log(
				`Renamed milestone "${sourceMilestone.title}" (${sourceMilestone.id}) -> "${renamedMilestone.title}" (${renamedMilestone.id}).`,
			);
			if (updatedIds.length > 0) {
				console.log(`Updated ${updatedIds.length} task(s): ${updatedIds.join(", ")}`);
			}
		});

	milestoneCmd
		.command("remove <name>")
		.description("remove a milestone with task handling")
		.option("--keep", "keep task milestone values unchanged")
		.option("--clear", "clear milestone from tasks (default)")
		.option("--reassign <target>", "reassign tasks to another milestone")
		.action(
			async (name: string, options: { keep?: boolean; clear?: boolean; reassign?: string }) => {
				const cwd = await requireProjectRoot();
				const core = new Core(cwd);
				await core.ensureConfigLoaded();

				const normalizedName = normalizeMilestoneName(name);
				if (!normalizedName) {
					console.error("Milestone name cannot be empty.");
					process.exitCode = 1;
					return;
				}

				const milestones = await core.filesystem.listMilestones();
				const sourceMilestone = findMilestoneByAlias(normalizedName, milestones);
				if (!sourceMilestone) {
					console.error(`Milestone "${name}" not found.`);
					process.exitCode = 1;
					return;
				}

				const taskHandling = options.reassign
					? "reassign"
					: options.keep
						? "keep"
						: "clear";

				const reassignTo = options.reassign
					? normalizeMilestoneName(options.reassign)
					: undefined;

				let targetMilestone: Milestone | undefined;
				if (taskHandling === "reassign") {
					if (!reassignTo) {
						console.error("Target milestone name is required for --reassign.");
						process.exitCode = 1;
						return;
					}
					targetMilestone = findMilestoneByAlias(reassignTo, milestones);
					if (!targetMilestone) {
						console.error(`Target milestone "${reassignTo}" not found.`);
						process.exitCode = 1;
						return;
					}
					if (
						milestoneKey(targetMilestone.id) === milestoneKey(sourceMilestone.id)
					) {
						console.error("Target milestone must be different from the removed milestone.");
						process.exitCode = 1;
						return;
					}
				}

				const sourceKey = milestoneKey(sourceMilestone.title);
				const sourceIdKey = milestoneKey(sourceMilestone.id);
				let updatedIds: string[] = [];
				if (taskHandling !== "keep") {
					const tasks = await core.filesystem.listTasks();
					const matchingTasks = tasks.filter((task) => {
						if (!task.milestone) return false;
						const taskKey = milestoneKey(task.milestone);
						return taskKey === sourceKey || taskKey === sourceIdKey;
					});
					for (const task of matchingTasks) {
						try {
							await core.editTask(
								task.id,
								{
									milestone:
										taskHandling === "reassign" ? targetMilestone!.id : null,
								},
								false,
							);
							updatedIds.push(task.id);
						} catch (error) {
							console.error(`Failed to update task ${task.id}: ${error}`);
						}
					}
				}

				const archiveResult = await core.archiveMilestone(sourceMilestone.id, false);
				if (!archiveResult.success) {
					console.error(`Failed to remove milestone "${sourceMilestone.title}".`);
					process.exitCode = 1;
					return;
				}

				console.log(
					`Removed milestone "${sourceMilestone.title}" (${sourceMilestone.id}).`,
				);
				if (taskHandling === "keep") {
					console.log("Kept task milestone values unchanged.");
				} else if (taskHandling === "reassign") {
					console.log(
						`Reassigned ${updatedIds.length} task(s) to "${targetMilestone!.title}" (${targetMilestone!.id}): ${updatedIds.join(", ")}`,
					);
				} else {
					console.log(
						`Cleared milestone from ${updatedIds.length} task(s): ${updatedIds.join(", ")}`,
					);
				}
			},
		);

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
