import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI milestone filtering", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-milestone-filter");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		await mkdir(TEST_DIR, { recursive: true });

		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Milestone Filter Test Project");
		const newMilestone = await core.filesystem.createMilestone("New Milestones UI");

		await core.createTask(
			{
				id: "TASK-1",
				title: "Milestone task one",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Task in release milestone",
				milestone: "Release-1",
			},
			false,
		);

		await core.createTask(
			{
				id: "TASK-2",
				title: "Milestone task two",
				status: "In Progress",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Task in same milestone with different case",
				milestone: "release-1",
			},
			false,
		);

		await core.createTask(
			{
				id: "TASK-3",
				title: "Other milestone task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Task in different milestone",
				milestone: "Release-2",
			},
			false,
		);

		await core.createTask(
			{
				id: "TASK-4",
				title: "No milestone task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Task without milestone",
			},
			false,
		);

		await core.createTask(
			{
				id: "TASK-5",
				title: "Roadmap milestone task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Task in roadmap milestone",
				milestone: "Roadmap Alpha",
			},
			false,
		);

		await core.createTask(
			{
				id: "TASK-6",
				title: "ID milestone task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-18",
				labels: [],
				dependencies: [],
				description: "Task with milestone stored as ID",
				milestone: newMilestone.id,
			},
			false,
		);
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors - unique directory names prevent conflicts
		}
	});

	it("filters by milestone with case-insensitive matching", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({ filters: { milestone: "RELEASE-1" } });
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-1");
		expect(ids).toContain("TASK-2");
		expect(ids).not.toContain("TASK-3");
		expect(ids).not.toContain("TASK-4");
		expect(ids).not.toContain("TASK-5");
		expect(ids).not.toContain("TASK-6");
	});

	it("supports -m shorthand and combines milestone with status filter", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({ filters: { milestone: "release-1", status: "To Do" } });
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-1");
		expect(ids).not.toContain("TASK-2");
		expect(ids).not.toContain("TASK-3");
		expect(ids).not.toContain("TASK-4");
		expect(ids).not.toContain("TASK-5");
		expect(ids).not.toContain("TASK-6");
	});

	it("matches closest milestone for partial and typo inputs", async () => {
		const core = new Core(TEST_DIR);

		const typoTasks = await core.queryTasks({ filters: { milestone: "releas-1" } });
		const typoIds = typoTasks.map((t) => t.id);
		expect(typoIds).toContain("TASK-1");
		expect(typoIds).toContain("TASK-2");
		expect(typoIds).not.toContain("TASK-3");
		expect(typoIds).not.toContain("TASK-4");
		expect(typoIds).not.toContain("TASK-5");
		expect(typoIds).not.toContain("TASK-6");

		const partialTasks = await core.queryTasks({ filters: { milestone: "roadmp" } });
		const partialIds = partialTasks.map((t) => t.id);
		expect(partialIds).toContain("TASK-5");
		expect(partialIds).not.toContain("TASK-1");
		expect(partialIds).not.toContain("TASK-2");
		expect(partialIds).not.toContain("TASK-3");
		expect(partialIds).not.toContain("TASK-4");
		expect(partialIds).not.toContain("TASK-6");
	});

	it("matches milestone title when tasks store milestone IDs", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({ filters: { milestone: "new" } });
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-6");
		expect(ids).not.toContain("TASK-1");
		expect(ids).not.toContain("TASK-2");
		expect(ids).not.toContain("TASK-3");
		expect(ids).not.toContain("TASK-4");
		expect(ids).not.toContain("TASK-5");
	});

	it("preserves existing listing behavior when milestone filter is omitted", async () => {
		const core = new Core(TEST_DIR);
		const tasks = await core.queryTasks({});
		const ids = tasks.map((t) => t.id);
		expect(ids).toContain("TASK-1");
		expect(ids).toContain("TASK-2");
		expect(ids).toContain("TASK-3");
		expect(ids).toContain("TASK-4");
		expect(ids).toContain("TASK-5");
		expect(ids).toContain("TASK-6");
	});
});
