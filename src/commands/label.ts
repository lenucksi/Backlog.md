import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";

async function ensureLabelsMigrated(core: Core): Promise<void> {
	const config = await core.filesystem.loadConfig();
	if (!config) return;
	if (config.labels && config.labels.length > 0) return;

	const knownLabels = new Set<string>();
	const tasks = await core.filesystem.listTasks();
	for (const task of tasks) {
		for (const label of task.labels ?? []) {
			if (label) knownLabels.add(label);
		}
	}

	const docs = await core.filesystem.listDocuments();
	for (const doc of docs) {
		for (const label of doc.labels ?? []) {
			if (label) knownLabels.add(label);
		}
	}

	const decisions = await core.filesystem.listDecisions();
	for (const decision of decisions) {
		for (const label of decision.labels ?? []) {
			if (label) knownLabels.add(label);
		}
	}

	if (knownLabels.size > 0) {
		config.labels = Array.from(knownLabels).sort((a, b) => a.localeCompare(b));
		await core.filesystem.saveConfig(config);
		console.log(`Migrated ${knownLabels.size} existing label(s) into config.`);
	}
}

export function registerLabelCommand(program: Command): void {
	const labelCmd = program.command("label").description("manage backlog labels");

	labelCmd
		.command("list")
		.description("list all labels from config")
		.option("--json", "output as JSON")
		.action(async (options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const config = await core.filesystem.loadConfig();
			if (!config) {
				console.error("No backlog project found. Initialize one first with: backlog init");
				process.exit(1);
			}
			const labels = config.labels ?? [];
			if (options.json) {
				console.log(JSON.stringify(labels, null, 2));
				return;
			}
			if (labels.length === 0) {
				console.log("No labels configured.");
				return;
			}
			for (const label of labels) {
				console.log(`  ${label}`);
			}
		});

	labelCmd
		.command("add <name>")
		.description("add a new label")
		.action(async (name: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const config = await core.filesystem.loadConfig();
			if (!config) {
				console.error("No backlog project found. Initialize one first with: backlog init");
				process.exit(1);
			}
			await ensureLabelsMigrated(core);
			const reloaded = await core.filesystem.loadConfig();
			if (!reloaded) process.exit(1);
			if ((reloaded.labels ?? []).some((l) => (typeof l === "string" ? l : l.name) === name.toLowerCase())) {
				console.error(`Label already exists: ${name}`);
				process.exit(1);
			}
			reloaded.labels = [...(reloaded.labels ?? []), name].sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await core.filesystem.saveConfig(reloaded);
			console.log(`Added label: ${name}`);
		});

	labelCmd
		.command("rename <old> <new>")
		.description("rename a label and update all frontmatter")
		.action(async (oldName: string, newName: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const config = await core.filesystem.loadConfig();
			if (!config) {
				console.error("No backlog project found. Initialize one first with: backlog init");
				process.exit(1);
			}
			await ensureLabelsMigrated(core);
			const reloaded = await core.filesystem.loadConfig();
			if (!reloaded) process.exit(1);
			const labelIndex = (reloaded.labels ?? []).findIndex(
				(l) => (typeof l === "string" ? l : l.name) === oldName.toLowerCase(),
			);
			if (labelIndex === -1) {
				console.error(`Label not found: ${oldName}`);
				process.exit(1);
			}
			if (
				(reloaded.labels ?? []).some(
					(l) => (typeof l === "string" ? l : l.name) === newName.toLowerCase() && l !== reloaded.labels?.[labelIndex],
				)
			) {
				console.error(`Target label already exists: ${newName}`);
				process.exit(1);
			}
			reloaded.labels[labelIndex] = newName;
			reloaded.labels = reloaded.labels.sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await core.filesystem.saveConfig(reloaded);

			const renameInEntity = (labels: string[] | undefined): string[] | undefined => {
				if (!labels) return undefined;
				const updated = labels.map((l) => (l.toLowerCase() === oldName.toLowerCase() ? newName : l));
				return updated.length > 0 ? updated : undefined;
			};

			const tasks = await core.filesystem.listTasks();
			for (const task of tasks) {
				const updatedLabels = renameInEntity(task.labels);
				if (updatedLabels) {
					await core.editTask(task.id, { labels: updatedLabels }, false);
				}
			}

			const docs = await core.filesystem.listDocuments();
			for (const doc of docs) {
				const updatedLabels = renameInEntity(doc.labels);
				if (updatedLabels) {
					await core.updateDocumentFromInput({
						id: doc.id,
						labels: updatedLabels,
						content: doc.rawContent,
					});
				}
			}

			const decisions = await core.filesystem.listDecisions();
			for (const decision of decisions) {
				const updatedLabels = renameInEntity(decision.labels);
				if (updatedLabels) {
					await core.editDecision(decision.id, { labels: updatedLabels });
				}
			}

			console.log(`Renamed label "${oldName}" to "${newName}" in config and all entities.`);
		});

	labelCmd
		.command("remove <name>")
		.description("remove a label from config (does not remove from existing tasks/docs/decisions)")
		.action(async (name: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const config = await core.filesystem.loadConfig();
			if (!config) {
				console.error("No backlog project found. Initialize one first with: backlog init");
				process.exit(1);
			}
			await ensureLabelsMigrated(core);
			const reloaded = await core.filesystem.loadConfig();
			if (!reloaded) process.exit(1);
			const idx = (reloaded.labels ?? []).findIndex((l) => (typeof l === "string" ? l : l.name) === name.toLowerCase());
			if (idx === -1) {
				console.error(`Label not found: ${name}`);
				process.exit(1);
			}
			reloaded.labels = reloaded.labels.filter((_, i) => i !== idx);
			await core.filesystem.saveConfig(reloaded);
			console.log(`Removed label: ${name}`);
		});
}
