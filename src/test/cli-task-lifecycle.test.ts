import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("CLI Integration - task lifecycle", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-lifecycle");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {}
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {}
	});

	describe("task archive and state transition commands", () => {
		beforeEach(async () => {
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Archive Test Project");
		});

		it("should archive a task", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Archive Test Task",
					status: "Done",
					assignee: [],
					createdDate: "2025-06-08",
					labels: ["completed"],
					dependencies: [],
					rawContent: "Task ready for archiving",
				},
				false,
			);

			const success = await core.archiveTask("task-1", false);
			expect(success).toBe(true);

			const task = await core.filesystem.loadTask("task-1");
			expect(task).toBeNull();

			const { readdir } = await import("node:fs/promises");
			const archiveFiles = await readdir(join(TEST_DIR, "backlog", "archive", "tasks"));
			expect(archiveFiles.some((f) => f.startsWith("task-1"))).toBe(true);
		});

		it("should handle archiving non-existent task", async () => {
			const core = new Core(TEST_DIR);
			const success = await core.archiveTask("task-999", false);
			expect(success).toBe(false);
		});

		it("should demote task to drafts", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-2",
					title: "Demote Test Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: ["needs-revision"],
					dependencies: [],
					rawContent: "Task that needs to go back to drafts",
				},
				false,
			);

			const success = await core.demoteTask("task-2", false);
			expect(success).toBe(true);

			const task = await core.filesystem.loadTask("task-2");
			expect(task).toBeNull();

			const { readdir } = await import("node:fs/promises");
			const draftsFiles = await readdir(join(TEST_DIR, "backlog", "drafts"));
			expect(draftsFiles.some((f) => f.startsWith("draft-"))).toBe(true);

			const demotedDraft = await core.filesystem.loadDraft("draft-1");
			expect(demotedDraft?.title).toBe("Demote Test Task");
		});

		it("should promote draft to tasks", async () => {
			const core = new Core(TEST_DIR);

			const { task: draft } = await core.createTaskFromInput(
				{
					title: "Promote Test Draft",
					status: "Draft",
					labels: ["ready"],
					rawContent: "Draft ready for promotion",
				},
				false,
			);

			const success = await core.promoteDraft(draft.id, false);
			expect(success).toBe(true);

			const loadedDraft = await core.filesystem.loadDraft(draft.id);
			expect(loadedDraft).toBeNull();

			const { readdir } = await import("node:fs/promises");
			const tasksFiles = await readdir(join(TEST_DIR, "backlog", "tasks"));
			expect(tasksFiles.some((f) => f.startsWith("task-"))).toBe(true);

			const promotedTask = await core.filesystem.loadTask("task-1");
			expect(promotedTask?.title).toBe("Promote Test Draft");
		});

		it("should archive a draft", async () => {
			const core = new Core(TEST_DIR);

			const { task: draft } = await core.createTaskFromInput(
				{
					title: "Archive Test Draft",
					status: "Draft",
					labels: ["cancelled"],
					rawContent: "Draft that should be archived",
				},
				false,
			);

			const success = await core.archiveDraft(draft.id, false);
			expect(success).toBe(true);

			const loadedDraft = await core.filesystem.loadDraft(draft.id);
			expect(loadedDraft).toBeNull();

			const { readdir } = await import("node:fs/promises");
			const archiveFiles = await readdir(join(TEST_DIR, "backlog", "archive", "drafts"));
			expect(archiveFiles.some((f) => f.startsWith(draft.id.toLowerCase()))).toBe(true);
		});

		it("should handle promoting non-existent draft", async () => {
			const core = new Core(TEST_DIR);
			const success = await core.promoteDraft("task-999", false);
			expect(success).toBe(false);
		});

		it("should handle demoting non-existent task", async () => {
			const core = new Core(TEST_DIR);
			const success = await core.demoteTask("task-999", false);
			expect(success).toBe(false);
		});

		it("should handle archiving non-existent draft", async () => {
			const core = new Core(TEST_DIR);
			const success = await core.archiveDraft("task-999", false);
			expect(success).toBe(false);
		});

		it("should commit archive operations automatically", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-5",
					title: "Commit Archive Test",
					status: "Done",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Testing auto-commit on archive",
				},
				false,
			);

			const success = await core.archiveTask("task-5", true);
			expect(success).toBe(true);

			const task = await core.filesystem.loadTask("task-5");
			expect(task).toBeNull();
		});

		it("should preserve task content through state transitions", async () => {
			const core = new Core(TEST_DIR);

			const originalTask = {
				id: "task-6",
				title: "Content Preservation Test",
				status: "In Progress",
				assignee: ["testuser"],
				createdDate: "2025-06-08",
				labels: ["important", "preservation-test"],
				dependencies: ["task-1", "task-2"],
				rawContent: "This task has rich metadata that should be preserved through transitions",
			};

			await core.createTask(originalTask, false);

			await core.demoteTask("task-6", false);

			const drafts = await core.filesystem.listDrafts();
			const asDraft = drafts.find((d) => d.title === originalTask.title);

			expect(asDraft?.title).toBe(originalTask.title);
			expect(asDraft?.assignee).toEqual(originalTask.assignee);
			expect(asDraft?.labels).toEqual(originalTask.labels);
			expect(asDraft?.dependencies).toEqual(originalTask.dependencies);
			expect(asDraft?.rawContent).toContain(originalTask.rawContent);

			expect(asDraft).toBeDefined();
			if (!asDraft) {
				throw new Error("Expected demoted draft to exist");
			}
			await core.promoteDraft(asDraft.id, false);

			const tasks = await core.filesystem.listTasks();
			const backToTask = tasks.find((t) => t.title === originalTask.title);

			expect(backToTask?.title).toBe(originalTask.title);
			expect(backToTask?.assignee).toEqual(originalTask.assignee);
			expect(backToTask?.labels).toEqual(originalTask.labels);
			expect(backToTask?.dependencies).toEqual(originalTask.dependencies);
			expect(backToTask?.rawContent).toContain(originalTask.rawContent);
		});
	});
});
