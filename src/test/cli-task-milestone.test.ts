import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI task milestone assignment", () => {
	const cliPath = join(process.cwd(), "src", "cli.ts");

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-task-milestone");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		await mkdir(TEST_DIR, { recursive: true });

		// INFRA: git setup
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "CLI Milestone Assignment Project");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors - unique directory names prevent conflicts
		}
	});

	it("creates tasks with milestone titles resolved to canonical milestone IDs", async () => {
		const core = new Core(TEST_DIR);
		const milestone = await core.filesystem.createMilestone("Release CLI");

		// CLI-CONTRACT: milestone --plain output format
		const result = await $`bun ${cliPath} task create "Milestone create task" --milestone "Release CLI" --plain`
			.cwd(TEST_DIR)
			.quiet();

		expect(result.exitCode).toBe(0);
		expect(result.stdout.toString()).toContain(`Milestone: ${milestone.id}`);

		const task = await core.filesystem.loadTask("task-1");
		expect(task?.milestone).toBe(milestone.id);
	});

	it("edits and clears task milestones from the CLI", async () => {
		const core = new Core(TEST_DIR);
		const first = await core.filesystem.createMilestone("Release Alpha");
		const second = await core.filesystem.createMilestone("Release Beta");

		// CLI-CONTRACT: milestone create flag parsing
		const create = await $`bun ${cliPath} task create "Milestone edit task" --milestone ${first.id}`
			.cwd(TEST_DIR)
			.quiet();
		expect(create.exitCode).toBe(0);

		// CLI-CONTRACT: milestone edit --plain output format
		const edit = await $`bun ${cliPath} task edit 1 --milestone "Release Beta" --plain`.cwd(TEST_DIR).quiet();
		expect(edit.exitCode).toBe(0);
		expect(edit.stdout.toString()).toContain(`Milestone: ${second.id}`);

		const updated = await core.filesystem.loadTask("task-1");
		expect(updated?.milestone).toBe(second.id);

		// CLI-CONTRACT: clear-milestone --plain output format
		const clear = await $`bun ${cliPath} task edit 1 --clear-milestone --plain`.cwd(TEST_DIR).quiet();
		expect(clear.exitCode).toBe(0);
		expect(clear.stdout.toString()).not.toContain("Milestone:");

		const cleared = await core.filesystem.loadTask("task-1");
		expect(cleared?.milestone).toBeUndefined();
	});

	it("rejects conflicting milestone edit flags", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("Release CLI");
		await $`bun ${cliPath} task create "Conflicting milestone flags"`.cwd(TEST_DIR).quiet();

		// CLI-CONTRACT: conflicting milestone flag error message
		const result = await $`bun ${cliPath} task edit 1 --milestone "Release CLI" --clear-milestone`
			.cwd(TEST_DIR)
			.quiet()
			.nothrow();

		expect(result.exitCode).toBe(1);
		expect(result.stderr.toString()).toContain("Cannot use --milestone and --clear-milestone together.");
	});

	it("shows milestone create and edit flags in help output", async () => {
		// CLI-CONTRACT: help text output
		const createHelp = await $`bun ${cliPath} task create --help`.cwd(TEST_DIR).quiet();
		// CLI-CONTRACT: help text output
		const editHelp = await $`bun ${cliPath} task edit --help`.cwd(TEST_DIR).quiet();

		expect(createHelp.stdout.toString()).toContain("-m, --milestone <milestone>");
		expect(editHelp.stdout.toString()).toContain("-m, --milestone <milestone>");
		expect(editHelp.stdout.toString()).toContain("--clear-milestone");
	});
});
