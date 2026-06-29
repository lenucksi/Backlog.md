import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core, EntityType } from "../index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI Zero Padded IDs Feature", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-zero-padded-ids");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		await mkdir(TEST_DIR, { recursive: true });

		// Initialize git and backlog project
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Padding Test", false); // No auto-commit for init

		// Enable zero padding in the config
		const config = await core.filesystem.loadConfig();
		if (config) {
			config.zeroPaddedIds = 3;
			config.autoCommit = false; // Disable auto-commit for easier testing
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

	test("should create a task with a zero-padded ID", async () => {
		const core = new Core(TEST_DIR);
		const result = await core.createTaskFromInput({ title: "Padded Task" });
		expect(result.task.id).toMatch(/^task-001/i);
	});

	test("should create a document with a zero-padded ID", async () => {
		const core = new Core(TEST_DIR);
		const id = await core.generateNextId(EntityType.Document);
		await core.filesystem.saveDocument({
			id,
			title: "Padded Doc",
			type: "guide",
			createdDate: new Date().toISOString().slice(0, 10),
			rawContent: "Padded doc content",
		});
		expect(id).toMatch(/^doc-001/i);
	});

	test("should create a decision with a zero-padded ID", async () => {
		const core = new Core(TEST_DIR);
		const id = await core.generateNextId(EntityType.Decision);
		await core.filesystem.saveDecision({
			id,
			title: "Padded Decision",
			date: new Date().toISOString().slice(0, 10),
			status: "proposed",
			context: "Context",
			decision: "Decision",
			consequences: "Consequences",
			rawContent: "Decision content",
		});
		expect(id).toMatch(/^decision-001/i);
	});

	test("should correctly increment a padded task ID", async () => {
		const core = new Core(TEST_DIR);
		await core.createTaskFromInput({ title: "First Padded Task" });
		const result = await core.createTaskFromInput({ title: "Second Padded Task" });
		expect(result.task.id).toMatch(/^task-002/i);
	});

	test("should create a sub-task with a zero-padded ID", async () => {
		const core = new Core(TEST_DIR);
		const parent = await core.createTaskFromInput({ title: "Parent Task" });
		const child = await core.createTaskFromInput({ title: "Padded Sub-task", parentTaskId: parent.task.id });
		expect(child.task.id).toMatch(/^task-001\.01/i);
	});
});
