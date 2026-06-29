import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
let core: Core;

describe("CLI --ref and --doc flags", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-refs-docs");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {}
		await mkdir(TEST_DIR, { recursive: true });

		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		core = new Core(TEST_DIR);
		await initializeTestProject(core, "CLI Refs Docs Test");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {}
	});

	describe("task create with --ref flag", () => {
		it("creates task with single reference", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				references: ["https://github.com/issue/123"],
			});

			expect(task.references).toContain("https://github.com/issue/123");
		});

		it("creates task with multiple references", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				references: ["https://github.com/issue/123", "src/api.ts"],
			});

			expect(task.references).toContain("https://github.com/issue/123");
			expect(task.references).toContain("src/api.ts");
		});

		it("creates task with comma-separated references", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				references: ["file1.ts", "file2.ts"],
			});

			expect(task.references).toContain("file1.ts");
			expect(task.references).toContain("file2.ts");
		});
	});

	describe("task create with --doc flag", () => {
		it("creates task with single documentation", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				documentation: ["https://design-docs.example.com"],
			});

			expect(task.documentation).toContain("https://design-docs.example.com");
		});

		it("creates task with multiple documentation entries", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				documentation: ["https://design-docs.example.com", "docs/spec.md"],
			});

			expect(task.documentation).toContain("https://design-docs.example.com");
			expect(task.documentation).toContain("docs/spec.md");
		});

		it("creates task with comma-separated documentation", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				documentation: ["doc1.md", "doc2.md"],
			});

			expect(task.documentation).toContain("doc1.md");
			expect(task.documentation).toContain("doc2.md");
		});
	});

	describe("task create with both --ref and --doc flags", () => {
		it("creates task with both references and documentation", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				references: ["src/api.ts"],
				documentation: ["https://design-docs.example.com"],
			});

			expect(task.references).toContain("src/api.ts");
			expect(task.documentation).toContain("https://design-docs.example.com");
		});
	});

	describe("task create with --modified-file flag", () => {
		it("creates task with multiple modified files", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				modifiedFiles: ["src/api.ts", "src/ui.ts"],
			});

			expect(task.modifiedFiles).toContain("src/api.ts");
			expect(task.modifiedFiles).toContain("src/ui.ts");
		});
	});

	describe("task edit with --ref flag", () => {
		it("sets references on existing task", async () => {
			const { task: created } = await core.createTaskFromInput({ title: "Feature" });

			const task = await core.editTask(created.id, { references: ["https://github.com/issue/456"] });

			expect(task.references).toContain("https://github.com/issue/456");
		});

		it("sets multiple references on existing task", async () => {
			const { task: created } = await core.createTaskFromInput({ title: "Feature" });

			const task = await core.editTask(created.id, { references: ["file1.ts", "file2.ts"] });

			expect(task.references).toContain("file1.ts");
			expect(task.references).toContain("file2.ts");
		});
	});

	describe("task edit with --doc flag", () => {
		it("sets documentation on existing task", async () => {
			const { task: created } = await core.createTaskFromInput({ title: "Feature" });

			const task = await core.editTask(created.id, { documentation: ["https://api-docs.example.com"] });

			expect(task.documentation).toContain("https://api-docs.example.com");
		});

		it("sets multiple documentation entries on existing task", async () => {
			const { task: created } = await core.createTaskFromInput({ title: "Feature" });

			const task = await core.editTask(created.id, { documentation: ["doc1.md", "doc2.md"] });

			expect(task.documentation).toContain("doc1.md");
			expect(task.documentation).toContain("doc2.md");
		});
	});

	describe("task edit with --modified-file flag", () => {
		it("sets modified files on existing task", async () => {
			const { task: created } = await core.createTaskFromInput({ title: "Feature" });

			const task = await core.editTask(created.id, { modifiedFiles: ["src/api.ts", "src/ui.ts"] });

			expect(task.modifiedFiles).toContain("src/api.ts");
			expect(task.modifiedFiles).toContain("src/ui.ts");
		});
	});

	describe("persistence in markdown files", () => {
		it("persists references in task markdown file", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				references: ["https://example.com", "src/index.ts"],
			});

			const loaded = await core.filesystem.loadTask(task.id);
			expect(loaded?.references).toContain("https://example.com");
			expect(loaded?.references).toContain("src/index.ts");
		});

		it("persists documentation in task markdown file", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				documentation: ["https://docs.example.com", "spec.md"],
			});

			const loaded = await core.filesystem.loadTask(task.id);
			expect(loaded?.documentation).toContain("https://docs.example.com");
			expect(loaded?.documentation).toContain("spec.md");
		});

		it("persists modified files in task markdown file", async () => {
			const { task } = await core.createTaskFromInput({
				title: "Feature",
				modifiedFiles: ["src/index.ts", "src/ui.ts"],
			});

			const loaded = await core.filesystem.loadTask(task.id);
			expect(loaded?.modifiedFiles).toContain("src/index.ts");
			expect(loaded?.modifiedFiles).toContain("src/ui.ts");
		});
	});
});
