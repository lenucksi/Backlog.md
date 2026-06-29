import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("Definition of Done CLI", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-definition-of-done-cli");
		await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
		await mkdir(TEST_DIR, { recursive: true });
		// INFRA: git setup
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "DoD CLI Project");
		const config = await core.filesystem.loadConfig();
		if (config) {
			config.definitionOfDone = ["Run tests", "Update docs"];
			await core.filesystem.saveConfig(config);
		}
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors - the unique directory names prevent conflicts
		}
	});

	it("creates task with Definition of Done defaults", async () => {
		const core = new Core(TEST_DIR);
		const { task } = await core.createTaskFromInput({ title: "DoD defaults task" });

		const saved = await core.filesystem.loadTask(task.id);
		const body = saved?.rawContent ?? "";
		expect(body).toContain("## Definition of Done");
		expect(body).toContain("- [ ] #1 Run tests");
		expect(body).toContain("- [ ] #2 Update docs");
	});

	it("disables Definition of Done defaults when disableDefinitionOfDoneDefaults is used", async () => {
		const core = new Core(TEST_DIR);
		const { task } = await core.createTaskFromInput({
			title: "DoD no defaults",
			disableDefinitionOfDoneDefaults: true,
		});

		const saved = await core.filesystem.loadTask(task.id);
		const body = saved?.rawContent ?? "";
		expect(body).not.toContain("## Definition of Done");
	});

	it("appends Definition of Done items with definitionOfDoneAdd", async () => {
		const core = new Core(TEST_DIR);
		const { task } = await core.createTaskFromInput({
			title: "DoD add",
			definitionOfDoneAdd: ["Ship notes", "Sync roadmap"],
		});

		const saved = await core.filesystem.loadTask(task.id);
		const body = saved?.rawContent ?? "";
		expect(body).toContain("- [ ] #1 Run tests");
		expect(body).toContain("- [ ] #2 Update docs");
		expect(body).toContain("- [ ] #3 Ship notes");
		expect(body).toContain("- [ ] #4 Sync roadmap");
	});

	it("edits Definition of Done items with check/uncheck/remove", async () => {
		const core = new Core(TEST_DIR);
		await core.createTaskFromInput({ title: "DoD edit" });

		await core.updateTaskFromInput("task-1", { checkDefinitionOfDone: [2] });
		let task = await core.filesystem.loadTask("task-1");
		let body = task?.rawContent ?? "";
		expect(body).toContain("- [x] #2 Update docs");

		await core.updateTaskFromInput("task-1", { removeDefinitionOfDone: [1] });
		task = await core.filesystem.loadTask("task-1");
		body = task?.rawContent ?? "";
		expect(body).not.toContain("Run tests");
		expect(body).toContain("- [x] #1 Update docs");

		await core.updateTaskFromInput("task-1", { uncheckDefinitionOfDone: [1] });
		task = await core.filesystem.loadTask("task-1");
		body = task?.rawContent ?? "";
		expect(body).toContain("- [ ] #1 Update docs");
	});
});
