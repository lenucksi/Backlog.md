import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";

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
		try { await safeCleanup(TEST_DIR); } catch { /* ignore */ }
	});

	it("task create with title and description", async () => {
		const r = await runBacklogCli(["task", "create", "My task", "-d", "A description"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("My task");
	});

	it("task create with status and priority", async () => {
		const r = await runBacklogCli(["task", "create", "Urgent!", "-s", "In Progress", "-p", "high"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Urgent!");
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
		const r = await runBacklogCli(["task", "list"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("task list with tasks", async () => {
		await runBacklogCli(["task", "create", "Task A"], TEST_DIR);
		await runBacklogCli(["task", "create", "Task B"], TEST_DIR);
		const r = await runBacklogCli(["task", "list"], TEST_DIR);
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
		const r = await runBacklogCli(["task", "list", "-s", "Done"], TEST_DIR);
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
		const r = await runBacklogCli(["task", "edit", "task-1", "-s", "Done", "-p", "low"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Done");
	});

	it("task view existing task", async () => {
		await runBacklogCli(["task", "create", "Viewable"], TEST_DIR);
		const r = await runBacklogCli(["task", "view", "task-1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Viewable");
	});

	it("task complete marks task done", async () => {
		await runBacklogCli(["task", "create", "Completable"], TEST_DIR);
		const r = await runBacklogCli(["task", "complete", "task-1"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Done");
	});

	it("task search finds tasks by text", async () => {
		await runBacklogCli(["task", "create", "Unique pattern XYZ"], TEST_DIR);
		await runBacklogCli(["task", "create", "Other task"], TEST_DIR);
		const r = await runBacklogCli(["task", "search", "Unique"], TEST_DIR);
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain("Unique pattern");
	});
});
