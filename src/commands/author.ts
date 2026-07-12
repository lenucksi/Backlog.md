import type { Command } from "commander";
import { colorizeLabel } from "../utils/ansi.ts";
import { ensureProjectConfig } from "../utils/cli-context.ts";
import { EXIT } from "../utils/exit-codes.ts";

function ensureAuthors(config: {
	authors?: Array<string | { name: string; color?: string }>;
}): Array<string | { name: string; color?: string }> {
	if (!config.authors) config.authors = [];
	return config.authors;
}

function findAuthorOrExit(
	config: {
		authors?: Array<string | { name: string; color?: string }>;
	},
	name: string,
): { authors: Array<string | { name: string; color?: string }>; idx: number } {
	const authors = ensureAuthors(config);
	const idx = authors.findIndex((a) => (typeof a === "string" ? a : a.name) === name.toLowerCase());
	if (idx === -1) {
		console.error(`Author not found: ${name}`);
		process.exit(EXIT.ERROR);
	}
	return { authors, idx };
}

export function registerAuthorCommand(program: Command): void {
	const authorCmd = program.command("author").description("manage backlog authors");

	authorCmd
		.command("list")
		.description("list all authors from config")
		.option("--json", "output as JSON")
		.action(async (options) => {
			const { config } = await ensureProjectConfig();
			const authors = config.authors ?? [];
			if (options.json) {
				console.log(JSON.stringify(authors, null, 2));
				return;
			}
			if (authors.length === 0) {
				console.log("No authors configured.");
				return;
			}
			for (const author of authors) {
				if (typeof author === "string") {
					console.log(`  ${author}`);
				} else {
					const indicator = author.color ? colorizeLabel(author.color, "●") : "";
					console.log(`  ${indicator}${indicator ? " " : ""}${author.name}${author.color ? ` (${author.color})` : ""}`);
				}
			}
		});

	authorCmd
		.command("add <name>")
		.description("add a new author")
		.option("--color <hex>", "hex color for the author (e.g. #ff0000)")
		.action(async (name: string, options) => {
			const { core, config } = await ensureProjectConfig();
			const authors = ensureAuthors(config);
			if (authors.some((a) => (typeof a === "string" ? a : a.name) === name.toLowerCase())) {
				console.error(`Author already exists: ${name}`);
				process.exit(EXIT.ERROR);
			}
			const newAuthor = options.color ? { name, color: options.color } : name;
			config.authors = [...authors, newAuthor].sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await core.filesystem.saveConfig(config);
			console.log(`Added author: ${name}`);
		});

	authorCmd
		.command("rename <old> <new>")
		.description("rename an author and update all task frontmatter")
		.action(async (oldName: string, newName: string) => {
			const { core, config } = await ensureProjectConfig();
			const authors = ensureAuthors(config);
			const authorIndex = authors.findIndex((a) => (typeof a === "string" ? a : a.name) === oldName.toLowerCase());
			if (authorIndex === -1) {
				console.error(`Author not found: ${oldName}`);
				process.exit(EXIT.ERROR);
			}
			if (
				authors.some(
					(a) => (typeof a === "string" ? a : a.name) === newName.toLowerCase() && a !== authors[authorIndex],
				)
			) {
				console.error(`Target author already exists: ${newName}`);
				process.exit(EXIT.ERROR);
			}
			authors[authorIndex] = newName;
			config.authors = authors.sort((a, b) =>
				(typeof a === "string" ? a : a.name).localeCompare(typeof b === "string" ? b : b.name),
			);
			await core.filesystem.saveConfig(config);

			const renameInEntity = (assignees: string[] | undefined): string[] | undefined => {
				if (!assignees) return undefined;
				const updated = assignees.map((a) => (a.toLowerCase() === oldName.toLowerCase() ? newName : a));
				return updated.length > 0 ? updated : undefined;
			};

			const tasks = await core.filesystem.listTasks();
			for (const task of tasks) {
				const updatedAssignees = renameInEntity(task.assignee);
				if (updatedAssignees) {
					try {
						await core.editTask(task.id, { assignee: updatedAssignees }, false);
					} catch {
						console.warn(`  Skipping task ${task.id} (not found, maybe from another branch)`);
					}
				}
			}

			console.log(`Renamed author "${oldName}" to "${newName}" in config and all entities.`);
		});

	authorCmd
		.command("remove <name>")
		.description("remove an author from config (does not remove from existing tasks)")
		.action(async (name: string) => {
			const { core, config } = await ensureProjectConfig();
			const { authors, idx } = findAuthorOrExit(config, name);
			config.authors = authors.filter((_, i) => i !== idx);
			await core.filesystem.saveConfig(config);
			console.log(`Removed author: ${name}`);
		});

	authorCmd
		.command("set-color <name> <color>")
		.description("set or update an author's color")
		.action(async (name: string, color: string) => {
			const { core, config } = await ensureProjectConfig();
			const { authors, idx } = findAuthorOrExit(config, name);
			const existing = authors[idx];
			if (!existing) return;
			if (typeof existing === "string") {
				authors[idx] = { name: existing, color };
			} else {
				authors[idx] = { name: existing.name, color };
			}
			config.authors = authors;
			await core.filesystem.saveConfig(config);
			console.log(`Set color for author "${name}" to ${color}`);
		});

	authorCmd
		.command("remove-color <name>")
		.description("remove an author's color")
		.action(async (name: string) => {
			const { core, config } = await ensureProjectConfig();
			const { authors, idx } = findAuthorOrExit(config, name);
			const existing = authors[idx];
			if (!existing) return;
			if (typeof existing === "string") {
				console.log(`Author "${name}" has no color to remove.`);
				return;
			}
			authors[idx] = existing.name;
			config.authors = authors;
			await core.filesystem.saveConfig(config);
			console.log(`Removed color from author "${name}".`);
		});
}
