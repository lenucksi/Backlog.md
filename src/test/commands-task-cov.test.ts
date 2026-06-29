import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("task command coverage", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("task-cov");
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Task Coverage Test");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			/* ignore */
		}
	});

	it("task create with title and description", async () => {
		const r = await runBacklogCli(["task", "create", "My task", "-d", "A description"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Created task");
	});

	it("task create with status and priority", async () => {
		const r = await runBacklogCli(["task", "create", "Urgent", "-s", "In Progress", "--priority", "high"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Created task");
	});

	it("task create with labels and assignee", async () => {
		const r = await runBacklogCli(["task", "create", "Labeled", "-l", "bug", "-a", "dev1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task create rejects empty title", async () => {
		const r = await runBacklogCli(["task", "create", ""], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
	});

	it("task list without tasks", async () => {
		const r = await runBacklogCli(["task", "list", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task list with tasks", async () => {
		await runBacklogCli(["task", "create", "Task A"], TEST_DIR);
		await runBacklogCli(["task", "create", "Task B"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Task A");
		expect(r.stdout).toContain("Task B");
	});

	it("task list --plain", async () => {
		await runBacklogCli(["task", "create", "Plain task"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Plain task");
	});

	it("task list with status filter", async () => {
		await runBacklogCli(["task", "create", "To do task"], TEST_DIR);
		await runBacklogCli(["task", "create", "Done task", "-s", "Done"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "-s", "Done", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Done task");
		expect(r.stdout).not.toContain("To do task");
	});

	it("task edit title", async () => {
		await runBacklogCli(["task", "create", "Original"], TEST_DIR);
		const r = await runBacklogCli(["task", "edit", "task-1", "-t", "Updated"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Updated");
	});

	it("task edit description", async () => {
		await runBacklogCli(["task", "create", "Desc task"], TEST_DIR);
		const r = await runBacklogCli(["task", "edit", "task-1", "-d", "New desc"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task edit status and priority", async () => {
		await runBacklogCli(["task", "create", "Status task"], TEST_DIR);
		const r = await runBacklogCli(["task", "edit", "task-1", "-s", "Done", "--priority", "low"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Updated task");
	});

	it("task view existing task", async () => {
		await runBacklogCli(["task", "create", "Viewable"], TEST_DIR);
		const r = await runBacklogCli(["task", "view", "task-1", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Viewable");
	});

	it("task archive existing task", async () => {
		await runBacklogCli(["task", "create", "Archivable"], TEST_DIR);
		const r = await runBacklogCli(["task", "archive", "task-1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Archived task");
	});

	it("task create with draft flag", async () => {
		const r = await runBacklogCli(["task", "create", "Drafty", "--draft"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Created draft");
	});

	it("task create with plan and notes", async () => {
		const r = await runBacklogCli(
			["task", "create", "Planned", "--plan", "Step 1", "--notes", "Note here", "--final-summary", "Done"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Created task");
	});

	it("task create with acceptance criteria", async () => {
		const r = await runBacklogCli(
			["task", "create", "Criteria", "--ac", "Must work", "--ac", "Must be fast"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Created task");
	});

	it("task create with milestone", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("v2");
		const r = await runBacklogCli(["task", "create", "Milestoned", "-m", "v2"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Created task");
	});

	it("task create with parent", async () => {
		await runBacklogCli(["task", "create", "Parent"], TEST_DIR);
		const r = await runBacklogCli(["task", "create", "Child", "-p", "task-1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task edit with label", async () => {
		await runBacklogCli(["task", "create", "Label edit"], TEST_DIR);
		const r = await runBacklogCli(["task", "edit", "task-1", "--add-label", "important"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Updated task");
	});

	it("task demote moves to drafts", async () => {
		await runBacklogCli(["task", "create", "Demotable"], TEST_DIR);
		const r = await runBacklogCli(["task", "demote", "task-1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Demoted task");
	});

	it("task create with ordinal and plain output", async () => {
		const r = await runBacklogCli(["task", "create", "Ordinal", "--ordinal", "500", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Ordinal");
	});

	it("task view with --plain", async () => {
		await runBacklogCli(["task", "create", "ViewPlain"], TEST_DIR);
		const r = await runBacklogCli(["task", "view", "task-1", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("ViewPlain");
	});

	it("task list with assignee filter", async () => {
		await runBacklogCli(["task", "create", "Assigned", "-a", "dev1"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "-a", "dev1", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Assigned");
	});

	it("task list with priority filter", async () => {
		await runBacklogCli(["task", "create", "HighPri", "--priority", "high"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "--priority", "high", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("HighPri");
	});

	it("task edit with milestone", async () => {
		await runBacklogCli(["task", "create", "Milestone edit"], TEST_DIR);
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("v3");
		const r = await runBacklogCli(["task", "edit", "task-1", "-m", "v3"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task edit invalid priority", async () => {
		await runBacklogCli(["task", "create", "Invalid pri"], TEST_DIR);
		const r = await runBacklogCli(["task", "edit", "task-1", "--priority", "extreme"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
	});

	it("task create invalid ordinal", async () => {
		const r = await runBacklogCli(["task", "create", "BadOrd", "--ordinal", "-1"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
	});

	it("task list with milestone filter", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("sprint1");
		await runBacklogCli(["task", "create", "Sprint task", "-m", "sprint1"], TEST_DIR);
		await runBacklogCli(["task", "create", "Other task"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "-m", "sprint1", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Sprint task");
	});

	it("task view non-existent task fails", async () => {
		const r = await runBacklogCli(["task", "view", "task-999"], TEST_DIR);
		expect(r.stderr).toContain("not found");
	});

	it("task catch-all with taskId shows task", async () => {
		await runBacklogCli(["task", "create", "CatchMe"], TEST_DIR);
		const r = await runBacklogCli(["task", "task-1", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("CatchMe");
	});

	it("task list with sort by id", async () => {
		await runBacklogCli(["task", "create", "Task A"], TEST_DIR);
		const r = await runBacklogCli(["task", "list", "--sort", "id", "--plain"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Task A");
	});

	it("task edit with acceptance criteria", async () => {
		await runBacklogCli(["task", "create", "AC edit"], TEST_DIR);
		const r = await runBacklogCli(["task", "edit", "task-1", "--ac", "Must work", "--plan", "Step 1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task archive non-existent task handles gracefully", async () => {
		const r = await runBacklogCli(["task", "archive", "task-999"], TEST_DIR);
		expect(r.stderr).toContain("not found");
	});
});
