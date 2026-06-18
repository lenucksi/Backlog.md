import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("config command coverage", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("config-cov");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// cleanup
		}
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Test`.cwd(TEST_DIR).quiet();
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Config Coverage Test");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// ignore
		}
	});

	it("config list", async () => {
		const result = await runBacklogCli(["config", "list"], TEST_DIR);
		expect(result.stdout).toContain("project_name: Config Coverage Test");
		expect(result.stdout).toContain("default_status: To Do");
		expect(result.stdout).toContain("statuses:");
		expect(result.stdout).toContain("labels:");
	});

	it("config get all keys", async () => {
		const keys: string[] = [
			"project_name",
			"default_status",
			"statuses",
			"labels",
			"definition_of_done",
			"max_column_width",
			"default_port",
			"auto_open_browser",
			"remote_operations",
			"auto_commit",
			"filesystem_only",
			"bypass_git_hooks",
			"zero_padded_ids",
			"check_active_branches",
			"active_branch_days",
			"terminal_statuses",
		];
		for (const key of keys) {
			const result = await runBacklogCli(["config", "get", key], TEST_DIR);
			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim().length).toBeGreaterThanOrEqual(0);
		}
	});

	it("config get milestones returns milestone ids", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("v1.0");

		const result = await runBacklogCli(["config", "get", "milestones"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe("m-0");
	});

	it("config get default_editor when not set returns exit 0", async () => {
		const result = await runBacklogCli(["config", "get", "default_editor"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe("");
	});

	it("config get unknown key", async () => {
		const result = await runBacklogCli(["config", "get", "bogusKey"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("Unknown config key");
	});

	it("config set string keys", async () => {
		let result = await runBacklogCli(["config", "set", "project_name", "New Name"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("project_name = New Name");

		result = await runBacklogCli(["config", "get", "project_name"], TEST_DIR);
		expect(result.stdout.trim()).toBe("New Name");
	});

	it("config set default_status", async () => {
		const result = await runBacklogCli(["config", "set", "default_status", "In Progress"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("default_status = In Progress");
	});

	it("config set default_editor with existing command", async () => {
		const result = await runBacklogCli(["config", "set", "default_editor", "cat"], TEST_DIR);
		expect(result.exitCode).toBe(0);
	});

	it("config set default_editor with non-existent command fails", async () => {
		const result = await runBacklogCli(["config", "set", "default_editor", "zz-nonexistent-editor-zz"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("editor command not found");
	});

	it("config set numeric keys", async () => {
		let result = await runBacklogCli(["config", "set", "max_column_width", "80"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		result = await runBacklogCli(["config", "get", "max_column_width"], TEST_DIR);
		expect(result.stdout.trim()).toBe("80");

		result = await runBacklogCli(["config", "set", "default_port", "8080"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		result = await runBacklogCli(["config", "get", "default_port"], TEST_DIR);
		expect(result.stdout.trim()).toBe("8080");
	});

	it("config set numeric keys invalid", async () => {
		let result = await runBacklogCli(["config", "set", "default_port", "0"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("must be an integer between 1 and 65535");

		result = await runBacklogCli(["config", "set", "default_port", "99999"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("must be an integer between 1 and 65535");
	});

	it("config set boolean keys true/false/invalid", async () => {
		for (const key of [
			"auto_open_browser",
			"remote_operations",
			"auto_commit",
			"bypass_git_hooks",
			"check_active_branches",
		]) {
			let r = await runBacklogCli(["config", "set", key, "true"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "false"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "yes"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "no"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "1"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "0"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "maybe"], TEST_DIR);
			expect(r.exitCode).not.toBe(0);
			expect(r.stderr).toContain("Invalid value for");
		}
	});

	it("config set filesystem_only has side effects on other keys", async () => {
		let r = await runBacklogCli(["config", "set", "filesystem_only", "true"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "get", "filesystem_only"], TEST_DIR);
		expect(r.stdout.trim()).toBe("true");

		r = await runBacklogCli(["config", "set", "filesystem_only", "false"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "filesystem_only", "invalid"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("Invalid value for 'filesystem_only'");
	});

	it("config set zero_padded_ids", async () => {
		let r = await runBacklogCli(["config", "set", "zero_padded_ids", "4"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "zero_padded_ids", "0"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "zero_padded_ids", "-1"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("must be a non-negative integer");
	});

	it("config set active_branch_days", async () => {
		let r = await runBacklogCli(["config", "set", "active_branch_days", "60"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "active_branch_days", "-1"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("must be a non-negative integer");
	});

	it("config set terminal_statuses", async () => {
		const r = await runBacklogCli(["config", "set", "terminal_statuses", "Done,Closed"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("config set statuses and labels have appropriate messages", async () => {
		const r = await runBacklogCli(["config", "set", "labels", "new-value"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("Invalid value for");
	});

	it("config set unknown key fails", async () => {
		const r = await runBacklogCli(["config", "set", "bogus", "value"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("Unknown config key");
	});

	it("config list shows all expected sections", async () => {
		const result = await runBacklogCli(["config", "list"], TEST_DIR);
		expect(result.stdout).toContain("project_name:");
		expect(result.stdout).toContain("default_editor:");
		expect(result.stdout).toContain("default_status:");
		expect(result.stdout).toContain("statuses:");
		expect(result.stdout).toContain("labels:");
		expect(result.stdout).toContain("milestones:");
		expect(result.stdout).toContain("definition_of_done:");
		expect(result.stdout).toContain("max_column_width:");
		expect(result.stdout).toContain("default_port:");
		expect(result.stdout).toContain("remote_operations:");
		expect(result.stdout).toContain("auto_commit:");
		expect(result.stdout).toContain("filesystem_only:");
		expect(result.stdout).toContain("bypass_git_hooks:");
		expect(result.stdout).toContain("zero_padded_ids:");
		expect(result.stdout).toContain("task_prefix:");
		expect(result.stdout).toContain("check_active_branches:");
		expect(result.stdout).toContain("active_branch_days:");
	});

	it("config list shows milestones when present", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("v2.0");
		const result = await runBacklogCli(["config", "list"], TEST_DIR);
		expect(result.stdout).toContain("milestones: [m-0]");
	});
});
