import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../index.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI parent task filtering", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-parent-filter");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		await mkdir(TEST_DIR, { recursive: true });

		// Initialize git repo first using shell API (same pattern as other tests)
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		// Initialize backlog project using Core (same pattern as other tests)
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Parent Filter Test Project");

		// Create a parent task
		await core.createTask(
			{
				id: "TASK-1",
				title: "Parent task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Parent task description",
			},
			false,
		);

		// Create child tasks
		await core.createTask(
			{
				id: "TASK-1.1",
				title: "Child task 1",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Child task 1 description",
				parentTaskId: "TASK-1",
			},
			false,
		);

		await core.createTask(
			{
				id: "TASK-1.2",
				title: "Child task 2",
				status: "In Progress",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Child task 2 description",
				parentTaskId: "TASK-1",
			},
			false,
		);

		// Create another standalone task
		await core.createTask(
			{
				id: "TASK-2",
				title: "Standalone task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Standalone task description",
			},
			false,
		);
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors - the unique directory names prevent conflicts
		}
	});

	it("should filter tasks by parent with full task ID", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({ filters: { parentTaskId: "TASK-1" } });
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-1.1");
		expect(ids).toContain("TASK-1.2");
		expect(ids).not.toContain("TASK-1");
		expect(ids).not.toContain("TASK-2");
	});

	it("should filter tasks by parent with short task ID", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({ filters: { parentTaskId: "1" } });
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-1.1");
		expect(ids).toContain("TASK-1.2");
		expect(ids).not.toContain("TASK-1");
		expect(ids).not.toContain("TASK-2");
	});

	it("should show error for non-existent parent task", async () => {
		const result = await runBacklogCli(["task", "list", "--parent", "task-999", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Parent task TASK-999 not found.");
	});

	it("should show message when parent has no children", async () => {
		const result = await runBacklogCli(["task", "list", "--parent", "task-2", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("No child tasks found for parent task TASK-2.");
	});

	it("should work with -p shorthand flag", async () => {
		const result = await runBacklogCli(["task", "list", "-p", "task-1", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("TASK-1.1 - Child task 1");
		expect(result.stdout).toContain("TASK-1.2 - Child task 2");
	});

	it("should combine parent filter with status filter", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({ filters: { parentTaskId: "TASK-1", status: "To Do" } });
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-1.1");
		expect(ids).not.toContain("TASK-1.2");
	});
});
