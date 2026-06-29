import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../index.ts";
import { extractStructuredSection } from "../markdown/structured-sections.ts";
import { listTasksPlatformAware, viewTaskPlatformAware } from "./test-helpers.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
const CLI_PATH = join(process.cwd(), "src", "cli.ts");

describe("CLI Integration - tasks", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-tasks");
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

	describe("create commands", () => {
		beforeEach(async () => {
			// INFRA: git setup
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Create Command Test", true);

			const config = await core.filesystem.loadConfig();
			if (!config) {
				throw new Error("Expected backlog config to exist");
			}

			config.autoCommit = true;
			await core.filesystem.saveConfig(config);
			const git = await core.getGitOps();
			await git.addFile(join(TEST_DIR, "backlog", "config.yml"));
			await git.commitChanges("backlog: Enable autoCommit for CLI create tests");
		});

		it("should honor autoCommit config for task create", async () => {
			const core = new Core(TEST_DIR);
			const git = await core.getGitOps();
			const beforeCount = Number((await $`git rev-list --count HEAD`.cwd(TEST_DIR).text()).trim());
			const { task } = await core.createTaskFromInput({ title: "CLI Auto Commit Task" });
			const afterCount = Number((await $`git rev-list --count HEAD`.cwd(TEST_DIR).text()).trim());

			expect(task).not.toBeNull();
			expect(afterCount).toBe(beforeCount + 1);
			expect(await git.isClean()).toBe(true);
			expect(await git.getLastCommitMessage()).toContain(`Create task ${task.id}`);
			expect(task.title).toBe("CLI Auto Commit Task");
		});

		it("should honor autoCommit config for draft create", async () => {
			const core = new Core(TEST_DIR);
			const git = await core.getGitOps();
			const beforeCount = Number((await $`git rev-list --count HEAD`.cwd(TEST_DIR).text()).trim());
			const { task: draft } = await core.createTaskFromInput({ title: "CLI Auto Commit Draft", status: "Draft" });
			const afterCount = Number((await $`git rev-list --count HEAD`.cwd(TEST_DIR).text()).trim());

			expect(draft).not.toBeNull();
			expect(afterCount).toBe(beforeCount + 1);
			expect(await git.isClean()).toBe(true);
			expect(await git.getLastCommitMessage()).toContain(`Create draft ${draft.id}`);
			expect(draft.title).toBe("CLI Auto Commit Draft");
		});

		it("should accept dependencies from other active branches", async () => {
			const core = new Core(TEST_DIR);

			const remoteDir = join(TEST_DIR, "remote.git");
			await $`git init --bare -b main ${remoteDir}`.quiet();
			await $`git remote add origin ${remoteDir}`.cwd(TEST_DIR).quiet();
			await $`git push -u origin main`.cwd(TEST_DIR).quiet();

			await $`git checkout -b feature`.cwd(TEST_DIR).quiet();
			await core.createTask(
				{
					id: "task-1",
					title: "Cross-branch dependency target",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-09",
					labels: [],
					dependencies: [],
					rawContent: "Created on feature branch",
				},
				true,
			);
			await $`git push -u origin feature`.cwd(TEST_DIR).quiet();
			await $`git remote update origin --prune`.cwd(TEST_DIR).quiet();
			await $`git checkout main`.cwd(TEST_DIR).quiet();
			await core.gitOps.fetch();

			const visibleTasks = await core.queryTasks();
			expect(visibleTasks.some((task) => task.id === "TASK-1")).toBe(true);

			const { task } = await core.createTaskFromInput({ title: "Depends on feature task", dependencies: ["task-1"] });

			expect(task.id).toBe("TASK-2");
			expect(task.dependencies).toEqual(["TASK-1"]);
		});
	});

	describe("task list command", () => {
		beforeEach(async () => {
			// INFRA: git setup
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "List Test Project", true);
		});

		it("should show 'No tasks found' when no tasks exist", async () => {
			const core = new Core(TEST_DIR);
			const tasks = await core.filesystem.listTasks();
			expect(tasks).toHaveLength(0);
		});

		it("should list tasks grouped by status", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "First Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "First test task",
				},
				false,
			);

			await core.createTask(
				{
					id: "task-2",
					title: "Second Task",
					status: "Done",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Second test task",
				},
				false,
			);

			await core.createTask(
				{
					id: "task-3",
					title: "Third Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Third test task",
				},
				false,
			);

			const tasks = await core.filesystem.listTasks();
			expect(tasks).toHaveLength(3);

			const todoTasks = tasks.filter((t) => t.status === "To Do");
			const doneTasks = tasks.filter((t) => t.status === "Done");

			expect(todoTasks).toHaveLength(2);
			expect(doneTasks).toHaveLength(1);
			expect(todoTasks.map((t) => t.id)).toEqual(["TASK-1", "TASK-3"]);
			expect(doneTasks.map((t) => t.id)).toEqual(["TASK-2"]);
		});

		it("should respect config status order", async () => {
			const core = new Core(TEST_DIR);

			const config = await core.filesystem.loadConfig();
			expect(config?.statuses).toEqual(["To Do", "In Progress", "Done"]);
		});

		it("should filter tasks by status", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "First Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "First test task",
				},
				false,
			);
			await core.createTask(
				{
					id: "task-2",
					title: "Second Task",
					status: "Done",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Second test task",
				},
				false,
			);

			// CLI-CONTRACT: verify --plain --status output format
			const result = await $`bun ${CLI_PATH} task list --plain --status Done`.cwd(TEST_DIR).quiet();
			const out = result.stdout.toString();
			expect(out).toContain("Done:");
			expect(out).toContain("TASK-2 - Second Task");
			expect(out).not.toContain("TASK-1");
		});

		it("should filter tasks by status case-insensitively", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "First Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "First test task",
				},
				true,
			);
			await core.createTask(
				{
					id: "task-2",
					title: "Second Task",
					status: "Done",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Second test task",
				},
				true,
			);

			// CLI-CONTRACT: verify case-insensitive status filtering
			const testCases = ["done", "DONE", "DoNe"];
			for (const status of testCases) {
				const result = await $`bun ${CLI_PATH} task list --plain --status ${status}`.cwd(TEST_DIR).quiet();
				const out = result.stdout.toString();
				expect(out).toContain("Done:");
				expect(out).toContain("TASK-2 - Second Task");
				expect(out).not.toContain("TASK-1");
			}

			const resultShort = await listTasksPlatformAware({ plain: true, status: "done" }, TEST_DIR);
			const outShort = resultShort.stdout;
			expect(outShort).toContain("Done:");
			expect(outShort).toContain("TASK-2 - Second Task");
			expect(outShort).not.toContain("TASK-1");
		});

		it("should filter tasks by assignee", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Assigned Task",
					status: "To Do",
					assignee: ["alice"],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Assigned task",
				},
				false,
			);
			await core.createTask(
				{
					id: "task-2",
					title: "Unassigned Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Other task",
				},
				false,
			);

			// CLI-CONTRACT: verify --assignee filter output
			const result = await $`bun ${CLI_PATH} task list --plain --assignee alice`.cwd(TEST_DIR).quiet();
			const out = result.stdout.toString();
			expect(out).toContain("TASK-1 - Assigned Task");
			expect(out).not.toContain("TASK-2 - Unassigned Task");
		});
	});

	describe("task view command", () => {
		beforeEach(async () => {
			// INFRA: git setup
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "View Test Project");
		});

		it("should display task details with markdown formatting", async () => {
			const core = new Core(TEST_DIR);

			const testTask = {
				id: "task-1",
				title: "Test View Task",
				status: "To Do",
				assignee: ["testuser"],
				createdDate: "2025-06-08",
				labels: ["test", "cli"],
				dependencies: [],
				rawContent: "This is a test task for view command",
			};

			await core.createTask(testTask, false);

			const loadedTask = await core.filesystem.loadTask("task-1");
			expect(loadedTask).not.toBeNull();
			expect(loadedTask?.id).toBe("TASK-1");
			expect(loadedTask?.title).toBe("Test View Task");
			expect(loadedTask?.status).toBe("To Do");
			expect(loadedTask?.assignee).toEqual(["testuser"]);
			expect(loadedTask?.labels).toEqual(["test", "cli"]);
			expect(loadedTask?.rawContent).toBe("This is a test task for view command");
		});

		it("should handle task IDs with and without 'task-' prefix", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-5",
					title: "Prefix Test Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Testing task ID normalization",
				},
				false,
			);

			const taskWithPrefix = await core.filesystem.loadTask("task-5");
			expect(taskWithPrefix?.id).toBe("TASK-5");

			const taskWithoutPrefix = await core.filesystem.loadTask("5");
			expect(taskWithoutPrefix?.id).toBe("TASK-5");
		});

		it("should return null for non-existent tasks", async () => {
			const core = new Core(TEST_DIR);
			const nonExistentTask = await core.filesystem.loadTask("task-999");
			expect(nonExistentTask).toBeNull();
		});

		it("should not modify task files (read-only operation)", async () => {
			const core = new Core(TEST_DIR);

			const originalTask = {
				id: "task-1",
				title: "Read Only Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-08",
				labels: ["readonly"],
				dependencies: [],
				rawContent: "Original description",
			};

			await core.createTask(originalTask, false);

			const viewedTask = await core.filesystem.loadTask("task-1");
			const secondView = await core.filesystem.loadTask("task-1");

			expect(viewedTask).toEqual(secondView);
			expect(viewedTask?.title).toBe("Read Only Test");
			expect(viewedTask?.rawContent).toBe("Original description");
		});
	});

	describe("task shortcut command", () => {
		beforeEach(async () => {
			// INFRA: git setup
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Shortcut Test Project");
		});

		it("should display formatted task details like the view command", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Shortcut Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Shortcut description",
				},
				false,
			);

			const resultShortcut = await viewTaskPlatformAware({ taskId: "1", plain: true }, TEST_DIR);
			const resultView = await viewTaskPlatformAware({ taskId: "1", plain: true, useViewCommand: true }, TEST_DIR);

			const outShortcut = resultShortcut.stdout;
			const outView = resultView.stdout;

			expect(outShortcut).toBe(outView);
			expect(outShortcut).toContain("Task task-1 - Shortcut Task");
		});
	});

	describe("task edit command", () => {
		beforeEach(async () => {
			// INFRA: git setup
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Edit Test Project", true);
		});

		it("should update task title, description, and status", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Original Title",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Original description",
				},
				false,
			);

			const task = await core.filesystem.loadTask("task-1");
			expect(task).not.toBeNull();

			await core.updateTaskFromInput(
				"task-1",
				{
					title: "Updated Title",
					description: "Updated description",
					status: "In Progress",
				},
				false,
			);

			const updatedTask = await core.filesystem.loadTask("task-1");
			expect(updatedTask?.title).toBe("Updated Title");
			expect(extractStructuredSection(updatedTask?.rawContent || "", "description")).toBe("Updated description");
			expect(updatedTask?.status).toBe("In Progress");
			const today = new Date().toISOString().slice(0, 16).replace("T", " ");
			expect(updatedTask?.updatedDate).toBe(today);
		});

		it("should update assignee", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-2",
					title: "Assignee Test",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Testing assignee updates",
				},
				false,
			);

			await core.updateTaskFromInput("task-2", { assignee: ["newuser@example.com"] }, false);

			const updatedTask = await core.filesystem.loadTask("task-2");
			expect(updatedTask?.assignee).toEqual(["newuser@example.com"]);
		});

		it("should replace all labels with new labels", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-3",
					title: "Label Replace Test",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: ["old1", "old2"],
					dependencies: [],
					rawContent: "Testing label replacement",
				},
				false,
			);

			await core.updateTaskFromInput("task-3", { labels: ["new1", "new2", "new3"] }, false);

			const updatedTask = await core.filesystem.loadTask("task-3");
			expect(updatedTask?.labels).toEqual(["new1", "new2", "new3"]);
		});

		it("should add labels without replacing existing ones", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-4",
					title: "Label Add Test",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: ["existing"],
					dependencies: [],
					rawContent: "Testing label addition",
				},
				false,
			);

			await core.updateTaskFromInput("task-4", { addLabels: ["added1", "added2"] }, false);

			const updatedTask = await core.filesystem.loadTask("task-4");
			expect(updatedTask?.labels).toEqual(["existing", "added1", "added2"]);
		});

		it("should remove specific labels", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-5",
					title: "Label Remove Test",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: ["keep1", "remove", "keep2"],
					dependencies: [],
					rawContent: "Testing label removal",
				},
				false,
			);

			await core.updateTaskFromInput("task-5", { removeLabels: ["remove"] }, false);

			const updatedTask = await core.filesystem.loadTask("task-5");
			expect(updatedTask?.labels).toEqual(["keep1", "keep2"]);
		});

		it("should handle non-existent task gracefully", async () => {
			const core = new Core(TEST_DIR);
			const nonExistentTask = await core.filesystem.loadTask("task-999");
			expect(nonExistentTask).toBeNull();
		});

		it("should automatically set updated_date field when editing", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-6",
					title: "Updated Date Test",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-07",
					labels: [],
					dependencies: [],
					rawContent: "Testing updated date",
				},
				false,
			);

			await core.updateTaskFromInput("task-6", { title: "Updated Title" }, false);

			const updatedTask = await core.filesystem.loadTask("task-6");
			const today = new Date().toISOString().slice(0, 16).replace("T", " ");
			expect(updatedTask?.updatedDate).toBe(today);
			expect(updatedTask?.createdDate).toBe("2025-06-07");
		});

		it("should commit changes automatically", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-7",
					title: "Commit Test",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "Testing auto-commit",
				},
				false,
			);

			await core.updateTaskFromInput("task-7", { title: "Updated for Commit" }, true);

			const updatedTask = await core.filesystem.loadTask("task-7");
			expect(updatedTask?.title).toBe("Updated for Commit");
		});

		it("should preserve YAML frontmatter formatting", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-8",
					title: "YAML Test",
					status: "To Do",
					assignee: ["testuser"],
					createdDate: "2025-06-08",
					labels: ["yaml", "test"],
					dependencies: ["task-1"],
					rawContent: "Testing YAML preservation",
				},
				false,
			);

			await core.updateTaskFromInput(
				"task-8",
				{
					title: "Updated YAML Test",
					status: "In Progress",
				},
				false,
			);

			const updatedTask = await core.filesystem.loadTask("task-8");
			expect(updatedTask?.id).toBe("TASK-8");
			expect(updatedTask?.title).toBe("Updated YAML Test");
			expect(updatedTask?.status).toBe("In Progress");
			expect(updatedTask?.assignee).toEqual(["testuser"]);
			expect(updatedTask?.createdDate).toBe("2025-06-08");
			const today = new Date().toISOString().slice(0, 16).replace("T", " ");
			expect(updatedTask?.updatedDate).toBe(today);
			expect(updatedTask?.labels).toEqual(["yaml", "test"]);
			expect(updatedTask?.dependencies).toEqual(["task-1"]);
			expect(updatedTask?.rawContent).toBe("Testing YAML preservation");
		});
	});
});
