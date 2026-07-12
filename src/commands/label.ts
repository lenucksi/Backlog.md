import type { Command } from "commander";
import type { Core } from "../core/backlog.ts";
import { colorizeLabel } from "../utils/ansi.ts";
import { ensureProjectConfig } from "../utils/cli-context.ts";
import { EXIT } from "../utils/exit-codes.ts";
import { getLogger } from "../utils/logger.ts";
import { applyOutputOptions, getOutputMode, stdout } from "../utils/output.ts";

async function ensureLabelsMigrated(core: Core): Promise<void> {
	const config = await core.filesystem.loadConfig();
	if (!config) return;

	const cleaned = (config.labels ?? []).filter((l) => (typeof l === "string" ? l !== "[object Object]" : true));
	if (cleaned.length !== (config.labels?.length ?? 0)) {
		config.labels = cleaned;
		await core.filesystem.saveConfig(config);
	}

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
		stdout(`Migrated ${knownLabels.size} existing label(s) into config.`);
	}
}

function preserveLabelColor(
	label: string | { name: string; color?: string },
	newName: string,
): string | { name: string; color?: string } {
	if (typeof label === "object" && label.color) {
		return { name: newName, color: label.color };
	}
	return newName;
}

async function loadConfigAfterMigration(core: Core) {
	await ensureLabelsMigrated(core);
	const reloaded = await core.filesystem.loadConfig();
	if (!reloaded) process.exit(EXIT.ERROR);
	return reloaded;
}

async function updateLabelsOnEntities(core: Core, oldName: string, newName: string): Promise<void> {
	const renameLabelInList = (labels: string[] | undefined): string[] | undefined => {
		if (!labels) return undefined;
		const updated = labels.map((l) => (l.toLowerCase() === oldName.toLowerCase() ? newName : l));
		return updated.length > 0 ? updated : undefined;
	};

	const tasks = await core.filesystem.listTasks();
	for (const task of tasks) {
		const updatedLabels = renameLabelInList(task.labels);
		if (updatedLabels) {
			try {
				await core.editTask(task.id, { labels: updatedLabels }, false);
			} catch (e) {
				getLogger().debug(`Skipping task ${task.id}: ${e instanceof Error ? e.message : String(e)}`);
				console.warn(`  Skipping task ${task.id} (not found, maybe from another branch)`);
			}
		}
	}

	const docs = await core.filesystem.listDocuments();
	for (const doc of docs) {
		const updatedLabels = renameLabelInList(doc.labels);
		if (updatedLabels) {
			try {
				await core.updateDocumentFromInput({
					id: doc.id,
					labels: updatedLabels,
					content: doc.rawContent,
				});
			} catch (e) {
				getLogger().debug(`Skipping document ${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
				console.warn(`  Skipping document ${doc.id} (not found)`);
			}
		}
	}

	const decisions = await core.filesystem.listDecisions();
	for (const decision of decisions) {
		const updatedLabels = renameLabelInList(decision.labels);
		if (updatedLabels) {
			try {
				await core.editDecision(decision.id, { labels: updatedLabels });
			} catch (e) {
				getLogger().debug(`Skipping decision ${decision.id}: ${e instanceof Error ? e.message : String(e)}`);
				console.warn(`  Skipping decision ${decision.id} (not found)`);
			}
		}
	}
}

function findLabelOrExit(labels: Array<string | { name: string; color?: string }>, name: string): number {
	const idx = labels.findIndex((l) => (typeof l === "string" ? l : l.name) === name.toLowerCase());
	if (idx === -1) {
		console.error(`Label not found: ${name}`);
		process.exit(EXIT.ERROR);
	}
	return idx;
}

export function registerLabelCommand(program: Command): void {
	const labelCmd = program.command("label").description("manage backlog labels");

	labelCmd
		.command("list")
		.description("list all labels from config")
		.option("--json", "output as JSON")
		.action(async (options) => {
			applyOutputOptions(options);
			const { config } = await ensureProjectConfig();
			const labels = config.labels ?? [];
			if (getOutputMode() === "json") {
				stdout(labels);
				return;
			}
			if (labels.length === 0) {
				stdout("No labels configured.");
				return;
			}
			for (const label of labels) {
				if (typeof label === "string") {
					stdout(`  ${label}`);
				} else {
					const indicator = label.color ? colorizeLabel(label.color, "●") : "";
					stdout(`  ${indicator}${indicator ? " " : ""}${label.name}${label.color ? ` (${label.color})` : ""}`);
				}
			}
		});

	labelCmd
		.command("add <name>")
		.description("add a new label")
		.option("--color <hex>", "hex color for the label (e.g. #ff0000)")
		.action(async (name: string, options) => {
			const { core } = await ensureProjectConfig();
			const reloaded = await loadConfigAfterMigration(core);
			if ((reloaded.labels ?? []).some((l) => (typeof l === "string" ? l : l.name) === name.toLowerCase())) {
				console.error(`Label already exists: ${name}`);
				process.exit(EXIT.ERROR);
			}
			const newLabel = options.color ? { name, color: options.color } : name;
			reloaded.labels = [...(reloaded.labels ?? []), newLabel].sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await core.filesystem.saveConfig(reloaded);
			stdout(`Added label: ${name}`);
		});

	labelCmd
		.command("rename <old> <new>")
		.description("rename a label and update all frontmatter")
		.action(async (oldName: string, newName: string) => {
			const { core } = await ensureProjectConfig();
			const reloaded = await loadConfigAfterMigration(core);
			const labelIndex = (reloaded.labels ?? []).findIndex(
				(l) => (typeof l === "string" ? l : l.name) === oldName.toLowerCase(),
			);
			if (labelIndex === -1) {
				console.error(`Label not found: ${oldName}`);
				process.exit(EXIT.ERROR);
			}
			if (
				(reloaded.labels ?? []).some(
					(l) => (typeof l === "string" ? l : l.name) === newName.toLowerCase() && l !== reloaded.labels?.[labelIndex],
				)
			) {
				console.error(`Target label already exists: ${newName}`);
				process.exit(EXIT.ERROR);
			}
			const oldLabel = reloaded.labels[labelIndex];
			if (oldLabel) {
				reloaded.labels[labelIndex] = preserveLabelColor(oldLabel, newName);
			} else {
				reloaded.labels[labelIndex] = newName;
			}
			reloaded.labels = reloaded.labels.sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await core.filesystem.saveConfig(reloaded);

			await updateLabelsOnEntities(core, oldName, newName);

			stdout(`Renamed label "${oldName}" to "${newName}" in config and all entities.`);
		});

	labelCmd
		.command("remove <name>")
		.description("remove a label from config (does not remove from existing tasks/docs/decisions)")
		.action(async (name: string) => {
			const { core } = await ensureProjectConfig();
			const reloaded = await loadConfigAfterMigration(core);
			const idx = findLabelOrExit(reloaded.labels ?? [], name);
			reloaded.labels = reloaded.labels.filter((_, i) => i !== idx);
			await core.filesystem.saveConfig(reloaded);
			stdout(`Removed label: ${name}`);
		});

	labelCmd
		.command("set-color <name> <color>")
		.description("set or update a label's color")
		.action(async (name: string, color: string) => {
			const { core } = await ensureProjectConfig();
			const reloaded = await loadConfigAfterMigration(core);
			const idx = findLabelOrExit(reloaded.labels ?? [], name);
			const existing = reloaded.labels[idx];
			if (!existing) return;
			if (typeof existing === "string") {
				reloaded.labels[idx] = { name: existing, color };
			} else {
				reloaded.labels[idx] = { name: existing.name, color };
			}
			await core.filesystem.saveConfig(reloaded);
			stdout(`Set color for label "${name}" to ${color}`);
		});

	labelCmd
		.command("remove-color <name>")
		.description("remove a label's color")
		.action(async (name: string) => {
			const { core } = await ensureProjectConfig();
			const reloaded = await loadConfigAfterMigration(core);
			const idx = findLabelOrExit(reloaded.labels ?? [], name);
			const existing = reloaded.labels[idx];
			if (!existing) return;
			if (typeof existing === "string") {
				stdout(`Label "${name}" has no color to remove.`);
				return;
			}
			reloaded.labels[idx] = existing.name;
			await core.filesystem.saveConfig(reloaded);
			stdout(`Removed color from label "${name}".`);
		});
}
