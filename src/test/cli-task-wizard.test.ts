import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI task wizard integration compatibility", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-task-wizard");
		await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "CLI Wizard Compatibility");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors in tests
		}
	});

	it("preserves non-interactive missing title error for task create", async () => {
		const result = await runBacklogCli(["task", "create"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("error: missing required argument 'title'");
	});

	it("preserves non-interactive missing taskId error for task edit", async () => {
		const result = await runBacklogCli(["task", "edit"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("error: missing required argument 'taskId'");
	});

	it("keeps legacy non-interactive edit behavior when taskId is provided", async () => {
		await runBacklogCli(["task", "create", "Edit target", "--desc", "Before edit"], TEST_DIR);
		const result = await runBacklogCli(["task", "edit", "1"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("Updated task");
	});
});
