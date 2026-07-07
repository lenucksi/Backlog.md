import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../index.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI --plain for task create/edit", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-plain-create-edit");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {}
		await mkdir(TEST_DIR, { recursive: true });

		// Initialize git repo first using shell API (same as other tests)
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		// Initialize backlog project using Core
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Plain Create/Edit Project");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {}
	});

	it("prints plain details after task create --plain", async () => {
		const result = await runBacklogCli(["task", "create", "Example", "--desc", "Hello", "--plain"], TEST_DIR);

		const out = result.stdout;
		expect(result.exitCode).toBe(0);
		expect(out).toContain("File: ");
		expect(out).toContain("Task TASK-1 - Example");
		expect(out).toContain("Status:");
		expect(out).toContain("Created:");
		expect(out).toContain("Description:");
		expect(out).toContain("Hello");
		expect(out).toContain("Acceptance Criteria:");
		expect(out).toContain("Definition of Done:");
		expect(out).not.toContain("[?1049h");
		expect(out).not.toContain("\x1b");
	});

	it("assigns default tail ordinals and preserves explicit ordinals on CLI create", async () => {
		const first = await runBacklogCli(["task", "create", "First ordinal CLI task", "--plain"], TEST_DIR);
		expect(first.exitCode).toBe(0);
		expect(first.stdout).toContain("Ordinal: 1000");

		const second = await runBacklogCli(["task", "create", "Second ordinal CLI task", "--plain"], TEST_DIR);
		expect(second.exitCode).toBe(0);
		expect(second.stdout).toContain("Ordinal: 2000");

		const explicit = await runBacklogCli(
			["task", "create", "Explicit ordinal CLI task", "--ordinal", "7500", "--plain"],
			TEST_DIR,
		);
		expect(explicit.exitCode).toBe(0);
		expect(explicit.stdout).toContain("Ordinal: 7500");
	});

	it("rejects non-finite ordinals on CLI create", async () => {
		const result = await runBacklogCli(
			["task", "create", "Invalid ordinal CLI task", "--ordinal", "Infinity"],
			TEST_DIR,
		);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("Invalid ordinal: Infinity. Must be a non-negative number.");
	});

	it("prints plain details after task edit --plain", async () => {
		await runBacklogCli(["task", "create", "Edit Me", "--desc", "First"], TEST_DIR);

		const result = await runBacklogCli(["task", "edit", "1", "-s", "In Progress", "--plain"], TEST_DIR);

		const out = result.stdout;
		expect(result.exitCode).toBe(0);
		expect(out).toContain("File: ");
		expect(out).toContain("Task TASK-1 - Edit Me");
		expect(out).toContain("Status: ◒ In Progress");
		expect(out).toContain("Created:");
		expect(out).toContain("Updated:");
		expect(out).toContain("Description:");
		expect(out).toContain("Acceptance Criteria:");
		expect(out).toContain("Definition of Done:");
		expect(out).not.toContain("[?1049h");
		expect(out).not.toContain("\x1b");
	});
});
