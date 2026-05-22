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
		.option("-t, --type <type>", `document type (${DOCUMENT_TYPE_VALUES.join(", ")})`)
		.action(async (title: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const document = await core.createDocumentFromInput({
				title: title as string,
				type: (options.type || "other") as DocType["type"],
				path: options.path,
				content: "",
			});
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
			});

			console.log(`Updated document ${document.id}`);
			if (document.path) {
				console.log(`Path: ${core.filesystem.backlogDirName}/docs/${document.path}`);
			}
		});

	docCmd
		.command("list")
		.option("--plain", "use plain text output instead of interactive UI")
		.action(async (options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const docs = await core.filesystem.listDocuments();
			if (docs.length === 0) {
				console.log("No docs found.");
				return;
			}

			const usePlainOutput = isPlainRequested(options) || shouldAutoPlain;
			if (usePlainOutput) {
				for (const d of docs) {
					console.log(`${d.id} - ${d.title}`);
				}
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
		.action(async (docId: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			try {
				const content = await core.getDocumentContent(docId);
				if (content === null) {
					console.error(`Document ${docId} not found.`);
					return;
				}
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
