import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../index.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("--desc alias functionality", () => {
	const cliPath = join(process.cwd(), "src", "cli.ts");

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-desc-alias");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		await mkdir(TEST_DIR, { recursive: true });

		// Initialize git repo first
		await $`git init`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email "test@example.com"`.cwd(TEST_DIR).quiet();

		// Initialize backlog project using Core
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Desc Alias Test Project");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors - the unique directory names prevent conflicts
		}
	});

	it("should create task with --desc alias", async () => {
		const r = await runBacklogCli(["task", "create", "Test --desc alias", "--desc", "Created with --desc"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const task = await core.filesystem.loadTask("task-1");
		expect(task?.title).toBe("Test --desc alias");
		expect(task?.description).toContain("Created with --desc");
	});

	it("should verify task created with --desc has correct description", async () => {
		const r = await runBacklogCli(["task", "create", "Test task", "--desc", "Description via --desc"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const task = await core.filesystem.loadTask("task-1");

		expect(task).not.toBeNull();
		expect(task?.description).toContain("Description via --desc");
	});

	it("should edit task description with --desc alias", async () => {
		const core = new Core(TEST_DIR);
		await core.createTask(
			{
				id: "task-1",
				title: "Edit test task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-07-04",
				labels: [],
				dependencies: [],
				description: "Original description",
			},
			false,
		);

		const r = await runBacklogCli(["task", "edit", "1", "--desc", "Updated via --desc"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		const updatedTask = await core.filesystem.loadTask("task-1");
		expect(updatedTask?.description).toContain("Updated via --desc");
	});

	it("should create draft with description", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.saveDraft({
			id: "draft-1",
			title: "Draft with description",
			status: "To Do",
			assignee: [],
			createdDate: "2025-07-04",
			labels: [],
			dependencies: [],
			description: "Draft description",
		});
		const draft = await core.filesystem.loadDraft("draft-1");
		expect(draft?.description).toContain("Draft description");
	});

	it("should verify draft has correct description", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.saveDraft({
			id: "draft-1",
			title: "Test draft",
			status: "To Do",
			assignee: [],
			createdDate: "2025-07-04",
			labels: [],
			dependencies: [],
			description: "Draft description text",
		});

		const draft = await core.filesystem.loadDraft("draft-1");

		expect(draft).not.toBeNull();
		expect(draft?.description).toContain("Draft description text");
	});

	it("should show --desc in help text", async () => {
		const result = await $`bun ${cliPath} task create --help`.cwd(TEST_DIR).text();

		expect(result).toContain("-d, --description <text>");
		expect(result).toContain("--desc <text>");
		expect(result).toContain("alias for --description");
	});
});
