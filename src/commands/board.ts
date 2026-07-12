import { join } from "node:path";
import { stdin as input } from "node:process";
import { createInterface } from "node:readline/promises";
import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { collectArchivedMilestoneKeys, milestoneKey } from "../core/milestones.ts";
import { exportKanbanBoardToFile, updateReadmeWithBoard } from "../index.ts";
import type { Milestone, Task } from "../types/index.ts";
import { createLoadingScreen } from "../ui/loading.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import { stdout } from "../utils/output.ts";

function addBoardOptions(cmd: Command) {
	return cmd
		.option("-l, --layout <layout>", "board layout (horizontal|vertical)", "horizontal")
		.option("--vertical", "use vertical layout (shortcut for --layout vertical)")
		.option("-m, --milestones", "group tasks by milestone");
}

async function handleBoardView(options: { layout?: string; vertical?: boolean; milestones?: boolean }) {
	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	const config = await core.filesystem.loadConfig();

	const statuses = config?.statuses || [];

	const { runUnifiedView } = await import("../ui/unified-view.ts");
	await runUnifiedView({
		core,
		initialView: "kanban",
		milestoneMode: options.milestones,
		tasksLoader: async (updateProgress) => {
			const [tasks, milestoneEntities, archivedMilestones] = await Promise.all([
				core.loadTasks((msg) => {
					updateProgress(msg);
				}),
				core.filesystem.listMilestones(),
				core.filesystem.listArchivedMilestones(),
			]);
			const resolveMilestoneAlias = (value?: string): string => {
				const normalized = (value ?? "").trim();
				if (!normalized) {
					return "";
				}
				const key = normalized.toLowerCase();
				const looksLikeMilestoneId = /^\d+$/.test(normalized) || /^m-\d+$/i.test(normalized);
				const canonicalInputId = looksLikeMilestoneId
					? `m-${String(Number.parseInt(normalized.replace(/^m-/i, ""), 10))}`
					: null;
				const aliasKeys = new Set<string>([key]);
				if (/^\d+$/.test(normalized)) {
					const numericAlias = String(Number.parseInt(normalized, 10));
					aliasKeys.add(numericAlias);
					aliasKeys.add(`m-${numericAlias}`);
				} else {
					const idMatch = normalized.match(/^m-(\d+)$/i);
					if (idMatch?.[1]) {
						const numericAlias = String(Number.parseInt(idMatch[1], 10));
						aliasKeys.add(numericAlias);
						aliasKeys.add(`m-${numericAlias}`);
					}
				}
				const idMatchesAlias = (milestoneId: string): boolean => {
					const idKey = milestoneId.trim().toLowerCase();
					if (aliasKeys.has(idKey)) {
						return true;
					}
					const idMatch = milestoneId.trim().match(/^m-(\d+)$/i);
					if (!idMatch?.[1]) {
						return false;
					}
					const numericAlias = String(Number.parseInt(idMatch[1], 10));
					return aliasKeys.has(numericAlias) || aliasKeys.has(`m-${numericAlias}`);
				};
				const findIdMatch = (milestones: Milestone[]): Milestone | undefined => {
					const rawExactMatch = milestones.find((milestone) => milestone.id.trim().toLowerCase() === key);
					if (rawExactMatch) {
						return rawExactMatch;
					}
					if (canonicalInputId) {
						const canonicalRawMatch = milestones.find(
							(milestone) => milestone.id.trim().toLowerCase() === canonicalInputId,
						);
						if (canonicalRawMatch) {
							return canonicalRawMatch;
						}
					}
					return milestones.find((milestone) => idMatchesAlias(milestone.id));
				};

				const activeIdMatch = findIdMatch(milestoneEntities);
				if (activeIdMatch) {
					return activeIdMatch.id;
				}
				if (looksLikeMilestoneId) {
					const archivedIdMatch = findIdMatch(archivedMilestones);
					if (archivedIdMatch) {
						return archivedIdMatch.id;
					}
				}
				const activeTitleMatches = milestoneEntities.filter(
					(milestone) => milestone.title.trim().toLowerCase() === key,
				);
				if (activeTitleMatches.length === 1) {
					return activeTitleMatches[0]?.id ?? normalized;
				}
				if (activeTitleMatches.length > 1) {
					return normalized;
				}
				const archivedIdMatch = findIdMatch(archivedMilestones);
				if (archivedIdMatch) {
					return archivedIdMatch.id;
				}
				const archivedTitleMatches = archivedMilestones.filter(
					(milestone) => milestone.title.trim().toLowerCase() === key,
				);
				if (archivedTitleMatches.length === 1) {
					return archivedTitleMatches[0]?.id ?? normalized;
				}
				return normalized;
			};
			const archivedKeys = new Set(collectArchivedMilestoneKeys(archivedMilestones, milestoneEntities));
			const normalizedTasks =
				archivedKeys.size > 0
					? tasks.map((task) => {
							const key = milestoneKey(resolveMilestoneAlias(task.milestone));
							if (!key || !archivedKeys.has(key)) {
								return task;
							}
							return { ...task, milestone: undefined };
						})
					: tasks;
			return {
				tasks: normalizedTasks.map((t) => ({ ...t, status: t.status || "" })),
				statuses,
			};
		},
	});
}

export function registerBoardCommand(program: Command, version: string): void {
	const boardCmd = program.command("board");

	addBoardOptions(boardCmd).description("display tasks in a Kanban board").action(handleBoardView);

	addBoardOptions(boardCmd.command("view").description("display tasks in a Kanban board")).action(handleBoardView);

	boardCmd
		.command("export [filename]")
		.description("export kanban board to markdown file")
		.option("--force", "overwrite existing file without confirmation")
		.option("--readme", "export to README.md with markers")
		.option("--export-version <version>", "version to include in the export")
		.action(async (filename, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];

			const loadingScreen = await createLoadingScreen("Loading tasks for export");

			let finalTasks: Task[];
			try {
				finalTasks = await core.loadTasks((msg) => {
					loadingScreen?.update(msg);
				});

				loadingScreen?.update(`Total tasks: ${finalTasks.length}`);

				loadingScreen?.close();

				const { basename } = await import("node:path");
				const projectName = config?.projectName || basename(cwd);

				if (options.readme) {
					const exportVersion = options.exportVersion || version;
					await updateReadmeWithBoard(finalTasks, statuses, projectName, exportVersion);
					stdout("Updated README.md with Kanban board.");
				} else {
					const outputFile = filename || "Backlog.md";
					const outputPath = join(cwd, outputFile as string);

					const fileExists = await Bun.file(outputPath).exists();
					if (fileExists && !options.force) {
						const rl = createInterface({ input });
						try {
							const answer = await rl.question(`File "${outputPath}" already exists. Overwrite? (y/N): `);
							if (!answer.toLowerCase().startsWith("y")) {
								stdout("Export cancelled.");
								return;
							}
						} finally {
							rl.close();
						}
					}

					await exportKanbanBoardToFile(finalTasks, statuses, outputPath, projectName, options.force || !fileExists);
					stdout(`Exported board to ${outputPath}`);
				}
			} catch (error) {
				loadingScreen?.close();
				throw error;
			}
		});
}
