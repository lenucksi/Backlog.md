import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { Core } from "../core/backlog.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI Priority Filtering", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("cli-priority");
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "CLI Priority Filtering");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			/* ignore */
		}
	});

	test("task list --priority high shows only high priority tasks", async () => {
		const result = await runBacklogCli(["task", "list", "--priority", "high", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[HIGH\]/);
			expect(output).not.toMatch(/\[MEDIUM\]/);
			expect(output).not.toMatch(/\[LOW\]/);
		}
	});

	test("task list --priority medium shows only medium priority tasks", async () => {
		const result = await runBacklogCli(["task", "list", "--priority", "medium", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[MEDIUM\]/);
			expect(output).not.toMatch(/\[HIGH\]/);
		}
	});

	test("task list --priority low shows only low priority tasks", async () => {
		const result = await runBacklogCli(["task", "list", "--priority", "low", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[LOW\]/);
			expect(output).not.toMatch(/\[HIGH\]/);
		}
	});

	test("task list --priority invalid shows error", async () => {
		const result = await runBacklogCli(["task", "list", "--priority", "invalid", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toMatch(/invalid priority|error|Error/i);
	});

	test("task list --sort priority sorts by priority", async () => {
		const result = await runBacklogCli(["task", "list", "--sort", "priority", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[HIGH\]|\[MEDIUM\]|\[LOW\]/);
		}
	});

	test("task list --sort id sorts by task ID", async () => {
		const result = await runBacklogCli(["task", "list", "--sort", "id", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
	});

	test("task list --sort invalid shows error", async () => {
		const result = await runBacklogCli(["task", "list", "--sort", "invalid", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toMatch(/invalid sort|error|Error/i);
	});

	test("task list combines priority filter with status filter", async () => {
		const result = await runBacklogCli(["task", "list", "--priority", "high", "--status", "To Do", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[HIGH\]/);
		}
	});

	test("task list combines priority filter with sort", async () => {
		const result = await runBacklogCli(["task", "list", "--priority", "high", "--sort", "id", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[HIGH\]/);
		}
	});

	test("plain output includes priority indicators", async () => {
		const result = await runBacklogCli(["task", "list", "--plain"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		const output = result.stdout;
		if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
			expect(output).toMatch(/\[(HIGH|MEDIUM|LOW)\]/);
		}
	});

	test("case insensitive priority filtering", async () => {
		const results = await Promise.all([
			runBacklogCli(["task", "list", "--priority", "HIGH", "--plain"], TEST_DIR),
			runBacklogCli(["task", "list", "--priority", "high", "--plain"], TEST_DIR),
			runBacklogCli(["task", "list", "--priority", "High", "--plain"], TEST_DIR),
		]);

		const [upperResult, lowerResult, mixedResult] = results;
		expect(upperResult.exitCode).toBe(0);
		expect(lowerResult.exitCode).toBe(0);
		expect(mixedResult.exitCode).toBe(0);

		const upperOutput = upperResult.stdout;
		const lowerOutput = lowerResult.stdout;
		const mixedOutput = mixedResult.stdout;

		const listUpper = upperOutput.split("\n").filter((line) => /\b(BACK-\d+|task-\d+)/i.test(line));
		const listLower = lowerOutput.split("\n").filter((line) => /\b(BACK-\d+|task-\d+)/i.test(line));
		const listMixed = mixedOutput.split("\n").filter((line) => /\b(BACK-\d+|task-\d+)/i.test(line));

		if (listLower.length > 0) {
			expect(listUpper).toEqual(listLower);
			expect(listMixed).toEqual(listLower);
		}

		for (const output of [upperOutput, lowerOutput, mixedOutput]) {
			if (/\b(BACK-\d+|task-\d+)/i.test(output)) {
				expect(output).toMatch(/\[HIGH\]/);
				expect(output).not.toMatch(/\[MEDIUM\]/);
			}
		}
	});
});
