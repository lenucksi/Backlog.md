import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../index.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
let SUBTASKS: Array<{ id: string; title: string }> = [];

describe("CLI plain output for AI agents", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-plain-output");
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
		await initializeTestProject(core, "Plain Output Test Project");

		// Create a test task
		await core.createTask(
			{
				id: "task-1",
				title: "Test task for plain output",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Test description",
			},
			false,
		);

		const { task: subtask1 } = await core.createTaskFromInput(
			{
				title: "Child task A",
				parentTaskId: "task-1",
			},
			false,
		);

		const { task: subtask2 } = await core.createTaskFromInput(
			{
				title: "Child task B",
				parentTaskId: "task-1",
			},
			false,
		);

		// Preserve order for assertions
		SUBTASKS = [subtask1, subtask2];

		// Create a second task without subtasks
		await core.createTask(
			{
				id: "task-2",
				title: "Standalone task for plain output",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-19",
				labels: [],
				dependencies: [],
				description: "Standalone description",
			},
			false,
		);

		// Create a test draft through the canonical create path
		await core.createTaskFromInput(
			{
				title: "Test draft for plain output",
				status: "Draft",
				description: "Test draft description",
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

	it("should output plain text with task view --plain", async () => {
		const result = await runBacklogCli(["task", "view", "1", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("File: ");
		expect(result.stdout).toContain("task-1 - Test-task-for-plain-output.md");
		expect(result.stdout).toContain("Task TASK-1 - Test task for plain output");
		expect(result.stdout).toContain("Status: ○ To Do");
		expect(result.stdout).toContain("Created: 2025-06-18");
		expect(result.stdout).toContain("Subtasks (2):");
		const [subtask1, subtask2] = SUBTASKS;
		if (subtask1 && subtask2) {
			expect(result.stdout).toContain(`- ${subtask1.id} - ${subtask1.title}`);
			expect(result.stdout).toContain(`- ${subtask2.id} - ${subtask2.title}`);
			expect(result.stdout.indexOf(subtask1.id)).toBeLessThan(result.stdout.indexOf(subtask2.id));
		}
		expect(result.stdout).toContain("Description:");
		expect(result.stdout).toContain("Test description");
		expect(result.stdout).toContain("Acceptance Criteria:");
		expect(result.stdout).toContain("Definition of Done:");
		expect(result.stdout).not.toContain("[?1049h");
		expect(result.stdout).not.toContain("\x1b");
	});

	it("should output plain text with task <id> --plain shortcut", async () => {
		const core = new Core(TEST_DIR);
		const task = await core.filesystem.loadTask("task-1");
		expect(task).not.toBeNull();
		expect(task?.id).toBe("TASK-1");

		const result = await runBacklogCli(["task", "1", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("File: ");
		expect(result.stdout).toContain("task-1 - Test-task-for-plain-output.md");
		expect(result.stdout).toContain("Task TASK-1 - Test task for plain output");
		expect(result.stdout).toContain("Status: ○ To Do");
		expect(result.stdout).toContain("Created: 2025-06-18");
		expect(result.stdout).toContain("Description:");
		expect(result.stdout).toContain("Test description");
		expect(result.stdout).toContain("Definition of Done:");
		expect(result.stdout).not.toContain("[?1049h");
		expect(result.stdout).not.toContain("\x1b");
	});

	it("should not include a subtask list when none exist", async () => {
		const result = await runBacklogCli(["task", "view", "2", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Task TASK-2 - Standalone task for plain output");
		expect(result.stdout).not.toContain("Subtasks (");
		expect(result.stdout).not.toContain("Subtasks:");
	});

	it("should output plain text with draft view --plain", async () => {
		const result = await runBacklogCli(["draft", "view", "1", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("File: ");
		expect(result.stdout).toContain("draft-1 - Test-draft-for-plain-output.md");
		expect(result.stdout).toContain("Task DRAFT-1 - Test draft for plain output");
		expect(result.stdout).toContain("Status: ○ Draft");
		expect(result.stdout).toMatch(/Created:\s+\d{4}-\d{2}-\d{2}/);
		expect(result.stdout).toContain("Description:");
		expect(result.stdout).toContain("Test draft description");
		expect(result.stdout).toContain("Definition of Done:");
		expect(result.stdout).not.toContain("[?1049h");
		expect(result.stdout).not.toContain("\x1b");
	});

	it("should output plain text with draft <id> --plain shortcut", async () => {
		const core = new Core(TEST_DIR);
		const draft = await core.filesystem.loadDraft("draft-1");
		expect(draft).not.toBeNull();
		expect(draft?.id).toBe("DRAFT-1");

		const result = await runBacklogCli(["draft", "1", "--plain"], TEST_DIR);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("File: ");
		expect(result.stdout).toContain("draft-1 - Test-draft-for-plain-output.md");
		expect(result.stdout).toContain("Task DRAFT-1 - Test draft for plain output");
		expect(result.stdout).toContain("Status: ○ Draft");
		expect(result.stdout).toMatch(/Created:\s+\d{4}-\d{2}-\d{2}/);
		expect(result.stdout).toContain("Description:");
		expect(result.stdout).toContain("Test draft description");
		expect(result.stdout).toContain("Definition of Done:");
		expect(result.stdout).not.toContain("[?1049h");
		expect(result.stdout).not.toContain("\x1b");
	});

	// Task list already has --plain support and works correctly
});
