import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { extractStructuredSection } from "../markdown/structured-sections.ts";
import type { Task } from "../types/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
const CLI_PATH = join(process.cwd(), "src", "cli.ts");

describe("Final Summary CLI", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-final-summary-cli");
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Final Summary CLI Test Project");
	});

	afterEach(async () => {
		await safeCleanup(TEST_DIR).catch(() => {});
	});

	it("supports --final-summary on task create", async () => {
		const core = new Core(TEST_DIR);
		const { task } = await core.createTaskFromInput({ title: "Task A", finalSummary: "PR-ready summary" });
		expect(task.id).toBe("TASK-1");
		expect(task.rawContent).toContain("## Final Summary");
		expect(extractStructuredSection(task.rawContent ?? "", "finalSummary")).toBe("PR-ready summary");
	});

	it("supports set/append/clear flags on task edit", async () => {
		const core = new Core(TEST_DIR);
		const base: Task = {
			id: "task-1",
			title: "Editable task",
			status: "To Do",
			assignee: [],
			createdDate: "2025-07-03",
			labels: [],
			dependencies: [],
			description: "Initial description",
		};
		await core.createTask(base, false);

		await core.editTask("task-1", { finalSummary: "Initial summary" });
		let body = await core.getTaskContent("task-1");
		expect(extractStructuredSection(body ?? "", "finalSummary")).toBe("Initial summary");

		await core.editTask("task-1", { appendFinalSummary: ["Second", "Third"] });
		body = await core.getTaskContent("task-1");
		expect(extractStructuredSection(body ?? "", "finalSummary")).toBe("Initial summary\n\nSecond\n\nThird");

		await core.editTask("task-1", { clearFinalSummary: true });
		body = await core.getTaskContent("task-1");
		expect(extractStructuredSection(body ?? "", "finalSummary")).toBeUndefined();
		expect(body).not.toContain("## Final Summary");
	});

	it("renders Final Summary in plain output after Implementation Notes when present", async () => {
		const core = new Core(TEST_DIR);
		await core.createTask(
			{
				id: "task-1",
				title: "Plain output task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-07-03",
				labels: [],
				dependencies: [],
				description: "Desc",
				implementationNotes: "Notes",
				finalSummary: "Summary",
			},
			false,
		);

		const result = await $`bun ${[CLI_PATH, "task", "view", "1", "--plain"]}`.cwd(TEST_DIR).quiet().nothrow();
		expect(result.exitCode).toBe(0);

		const output = result.stdout.toString();
		expect(output).toContain("Implementation Notes:");
		expect(output).toContain("Final Summary:");
		expect(output.indexOf("Final Summary:")).toBeGreaterThan(output.indexOf("Implementation Notes:"));
	});
});
