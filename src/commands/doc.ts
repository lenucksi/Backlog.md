import { join } from "node:path";
import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { DOCUMENT_TYPE_VALUES, type Document as DocType } from "../types/index.ts";
import { genericSelectList } from "../ui/components/generic-list.ts";
import { scrollableViewer } from "../ui/tui.ts";
import {
	createMultiValueAccumulator,
	isPlainRequested,
	requireProjectRoot,
	shouldAutoPlain,
} from "../utils/cli-context.ts";
import { parseDelimitedStringList } from "../utils/task-builders.ts";

export function registerDocCommand(program: Command): void {
	const docCmd = program.command("doc");

	docCmd
		.command("create <title>")
		.option("-p, --path <path>")
\t\t.option("-t, --type <type>", `document type (${DOCUMENT_TYPE_VALUES.join(", ")})`)
\t\t.option("-l, --labels <labels>", "set labels (comma-separated)")
\t\t.action(async (title: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const document = await core.createDocumentFromInput({
				title: title as string,
				type: (options.type || "other") as DocType["type"],
\t\t\t\tpath: options.path,
\t\t\t\tlabels: options.labels
\t\t\t\t\t? String(options.labels)
\t\t\t\t\t\t	.split(",")
\t\t\t\t\t\t	.map((label: string) => label.trim())
\t\t\t\t\t\t	.filter(Boolean)
\t\t\t\t\t: undefined,
\t\t\t\tcontent: "",
\t\t\t});
			console.log(`Created document ${document.id}`);
			if (document.path) {
				console.log(`Path: ${core.filesystem.backlogDirName}/docs/${document.path}`);
			}
		});

	docCmd
		.command("update <docId>")
		.description("update a document")
		.option("--title <title>", "update document title")
		.option("--content <content>", "replace document markdown content")
		.option("-p, --path <path>", "move document under a docs-relative path (absolute paths and .. are rejected)")
		.option("-t, --type <type>", `document type (${DOCUMENT_TYPE_VALUES.join(", ")})`)
		.option("--tags <tags>", "set tags (comma-separated or use multiple times)", createMultiValueAccumulator())
		.option("--labels <labels>", "set labels (comma-separated or use multiple times)", createMultiValueAccumulator())
		.action(async (docId: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const existingDocument = await core.getDocument(docId);
			if (!existingDocument) {
				throw new Error(`Document not found: ${docId}`);
			}

			const document = await core.updateDocumentFromInput({
				id: docId,
				title: options.title,
				content: options.content ?? existingDocument.rawContent,
				type: options.type,
				path: options.path,
				...(options.tags !== undefined && { tags: parseDelimitedStringList(options.tags) ?? [] }),
				...(options.labels !== undefined && { labels: parseDelimitedStringList(options.labels) ?? [] }),
			});

			console.log(`Updated document ${document.id}`);
			if (document.path) {
				console.log(`Path: ${core.filesystem.backlogDirName}/docs/${document.path}`);
			}
		});

	docCmd
		.command("list")
		.option("--plain", "use plain text output instead of interactive UI")
		.option("--json", "output as JSON")
		.option("-l, --label <labels>", "filter by labels (comma-separated)")
		.action(async (options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			let docs = await core.filesystem.listDocuments();
\t\t\tconst labelFilters = options.label
\t\t\t\t? String(options.label).split(",").map((l: string) => l.trim().toLowerCase()).filter(Boolean)
\t\t\t\t: [];
\t\t\tif (labelFilters.length > 0) {
\t\t\t\tdocs = docs.filter((d) => {
\t\t\t\t\tconst docLabels = (d.labels ?? []).map((l: string) => l.toLowerCase());
\t\t\t\t\treturn labelFilters.every((filter: string) => docLabels.includes(filter));
\t\t\t\t});
\t\t\t}
\t\t\tif (docs.length === 0) {
				if (options.json) {
					console.log("[]");
				} else {
					console.log("No docs found.");
				}
				return;
			}

			if (options.json) {
				const data = docs.map((d) => ({
\t\t\t\t\tid: d.id,
\t\t\t\t\ttitle: d.title,
\t\t\t\t\ttype: d.type,
\t\t\t\t\tlabels: d.labels,
\t\t\t\t\ttags: d.tags,
					createdDate: d.createdDate,
					updatedDate: d.updatedDate ?? null,
					path: d.path ?? null,
				}));
				console.log(JSON.stringify(data, null, 2));
				return;
			}

			const usePlainOutput = isPlainRequested(options) || shouldAutoPlain;
\t\t\tif (usePlainOutput) {
\t\t\t\tfor (const d of docs) {
\t\t\t\t\tconst labelStr = d.labels && d.labels.length > 0 ? ` [${d.labels.join(", ")}]` : "";
\t\t\t\t\tconsole.log(`${d.id} - ${d.title}${labelStr}`);
\t\t\t\t}
				return;
			}

			const selected = await genericSelectList("Select a document", docs);
			if (selected) {
				const files = await Array.fromAsync(
					new Bun.Glob("**/*.md").scan({ cwd: core.filesystem.docsDir, followSymlinks: true }),
				);
				const docFile = files.find(
					(f) => f.startsWith(`${selected.id} -`) || f.endsWith(`/${selected.id}.md`) || f === `${selected.id}.md`,
				);
				if (docFile) {
					const filePath = join(core.filesystem.docsDir, docFile);
					const content = await Bun.file(filePath).text();
					await scrollableViewer(content);
				}
			}
		});

	docCmd
		.command("view <docId>")
		.description("view a document")
		.option("--json", "output as JSON")
		.action(async (docId: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			try {
				const doc = await core.filesystem.loadDocument(docId).catch(() => null);
				if (!doc) {
					console.error(`Document ${docId} not found.`);
					return;
				}
				if (options.json) {
					console.log(JSON.stringify(doc, null, 2));
					return;
				}
				const content = doc.rawContent || "";
				await scrollableViewer(content);
			} catch {
				console.error(`Document ${docId} not found.`);
			}
		});

	docCmd
		.command("archive <docId>")
		.description("archive a document")
		.option("--force", "skip confirmation")
		.action(async (docId: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const doc = await core.filesystem.loadDocument(docId).catch(() => null);
			if (!doc) {
				console.error(`Document ${docId} not found.`);
				return;
			}
			if (!options.force) {
				console.log(`Archiving document "${doc.title}" (${doc.id})...`);
			}
			const success = await core.filesystem.archiveDocument(docId);
			if (success) {
				console.log(`Archived document ${docId} — ${doc.title}`);
			} else {
				console.error(`Failed to archive document ${docId}.`);
				process.exitCode = 1;
			}
		});

	docCmd
		.command("delete <docId>")
		.description("permanently delete a document")
		.option("--force", "skip confirmation")
		.action(async (docId: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const doc = await core.filesystem.loadDocument(docId).catch(() => null);
			if (!doc) {
				console.error(`Document ${docId} not found.`);
				return;
			}
			if (!options.force) {
				console.log(`Deleting document "${doc.title}" (${doc.id})...`);
			}
			const success = await core.filesystem.deleteDocument(docId);
			if (success) {
				console.log(`Deleted document ${docId} — ${doc.title}`);
			} else {
				console.error(`Failed to delete document ${docId}.`);
				process.exitCode = 1;
			}
		});
}
