import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../index.ts";
import type { Decision, Document } from "../types/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
const CLI_PATH = join(process.cwd(), "src", "cli.ts");

describe("CLI Integration - docs and decisions", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-docs");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {}
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {}
	});

	describe("doc and decision commands", () => {
		beforeEach(async () => {
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Doc Test Project");
		});

		it("should create and list documents", async () => {
			const core = new Core(TEST_DIR);
			const doc: Document = {
				id: "doc-1",
				title: "Guide",
				type: "guide",
				createdDate: "2025-06-08",
				rawContent: "Content",
			};
			await core.createDocument(doc, false);

			const docs = await core.filesystem.listDocuments();
			expect(docs).toHaveLength(1);
			expect(docs[0]?.title).toBe("Guide");
		});

		// CLI-CONTRACT: verify doc create output format with path
		it("should create documents in a subpath and print the persisted path", async () => {
			const result = await $`bun ${CLI_PATH} doc create "Setup Guide" -p guides/setup`.cwd(TEST_DIR).quiet();
			expect(result.exitCode).toBe(0);
			const stdout = result.stdout.toString();
			expect(stdout).toContain("Created document doc-1");
			expect(stdout).toContain("Path: backlog/docs/guides/setup/doc-1 - Setup-Guide.md");

			const core = new Core(TEST_DIR);
			const docs = await core.filesystem.listDocuments();
			expect(docs[0]?.path).toBe("guides/setup/doc-1 - Setup-Guide.md");
		});

		// CLI-CONTRACT: verify error output for unsafe path
		it("should reject unsafe document paths", async () => {
			const result = await $`bun ${CLI_PATH} doc create "Unsafe" -p ../outside`.cwd(TEST_DIR).quiet().nothrow();
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr.toString()).toContain("Document path cannot include traversal segments.");
		});

		// CLI-CONTRACT: verify doc update output format
		it("should update document content and metadata", async () => {
			const core = new Core(TEST_DIR);
			await core.createDocument(
				{
					id: "doc-1",
					title: "Setup Guide",
					type: "guide",
					createdDate: "2025-06-08",
					rawContent: "Old content",
					tags: ["setup"],
				},
				false,
				"guides/setup",
			);

			const updatedContent = "# Updated\n\nRun install steps.";
			const result =
				await $`bun ${CLI_PATH} doc update doc-1 --title "Install Runbook" --content ${updatedContent} -t specification --tags ops,runbook -p runbooks`
					.cwd(TEST_DIR)
					.quiet();
			expect(result.exitCode).toBe(0);
			expect(result.stdout.toString()).toContain("Updated document doc-1");
			expect(result.stdout.toString()).toContain("Path: backlog/docs/runbooks/doc-1 - Install-Runbook.md");

			const docs = await core.filesystem.listDocuments();
			const updated = docs.find((doc) => doc.id === "doc-1");
			expect(updated?.title).toBe("Install Runbook");
			expect(updated?.type).toBe("specification");
			expect(updated?.tags).toEqual(["ops", "runbook"]);
			expect(updated?.path).toBe("runbooks/doc-1 - Install-Runbook.md");
			expect(updated?.rawContent).toBe(updatedContent);
		});

		// CLI-CONTRACT: verify doc update preserves omitted fields
		it("should preserve omitted document fields when updating", async () => {
			const core = new Core(TEST_DIR);
			await core.createDocument(
				{
					id: "doc-1",
					title: "Setup Guide",
					type: "guide",
					createdDate: "2025-06-08",
					rawContent: "Keep this content",
					tags: ["setup", "guide"],
				},
				false,
				"guides",
			);

			await $`bun ${CLI_PATH} doc update doc-1 --title "Setup Handbook"`.cwd(TEST_DIR).quiet();

			const docs = await core.filesystem.listDocuments();
			const updated = docs.find((doc) => doc.id === "doc-1");
			expect(updated?.title).toBe("Setup Handbook");
			expect(updated?.type).toBe("guide");
			expect(updated?.tags).toEqual(["setup", "guide"]);
			expect(updated?.path).toBe("guides/doc-1 - Setup-Handbook.md");
			expect(updated?.rawContent).toBe("Keep this content");
		});

		// CLI-CONTRACT: verify error output for invalid update inputs
		it("should reject invalid document update inputs", async () => {
			const core = new Core(TEST_DIR);
			await core.createDocument(
				{
					id: "doc-1",
					title: "Setup Guide",
					type: "guide",
					createdDate: "2025-06-08",
					rawContent: "Content",
				},
				false,
			);

			const missing = await $`bun ${CLI_PATH} doc update doc-404 --content "Nope"`.cwd(TEST_DIR).quiet().nothrow();
			expect(missing.exitCode).not.toBe(0);
			expect(missing.stderr.toString()).toContain("Document not found: doc-404");

			const invalidType = await $`bun ${CLI_PATH} doc update doc-1 --content "Nope" -t invalid`
				.cwd(TEST_DIR)
				.quiet()
				.nothrow();
			expect(invalidType.exitCode).not.toBe(0);
			expect(invalidType.stderr.toString()).toContain(
				"Document type must be one of: readme, guide, specification, other.",
			);

			const unsafePath = await $`bun ${CLI_PATH} doc update doc-1 --content "Nope" -p ../outside`
				.cwd(TEST_DIR)
				.quiet()
				.nothrow();
			expect(unsafePath.exitCode).not.toBe(0);
			expect(unsafePath.stderr.toString()).toContain("Document path cannot include traversal segments.");
		});

		it("should create and list decisions", async () => {
			const core = new Core(TEST_DIR);
			const decision: Decision = {
				id: "decision-1",
				title: "Choose Stack",
				date: "2025-06-08",
				status: "accepted",
				context: "context",
				decision: "decide",
				consequences: "conseq",
				rawContent: "",
			};
			await core.createDecision(decision, false);
			const decisions = await core.filesystem.listDecisions();
			expect(decisions).toHaveLength(1);
			expect(decisions[0]?.title).toBe("Choose Stack");
		});
	});
});
