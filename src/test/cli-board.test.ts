import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../index.ts";
import { parseTask } from "../markdown/parser.ts";
import type { Task } from "../types/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
const _CLI_PATH = join(process.cwd(), "src", "cli.ts");

describe("CLI Integration - board", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-board");
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

	describe("board view command", () => {
		beforeEach(async () => {
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Board Test Project", true);
		});

		it("should display kanban board with tasks grouped by status", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Todo Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "A task in todo",
				},
				false,
			);

			await core.createTask(
				{
					id: "task-2",
					title: "Progress Task",
					status: "In Progress",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "A task in progress",
				},
				false,
			);

			await core.createTask(
				{
					id: "task-3",
					title: "Done Task",
					status: "Done",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "A completed task",
				},
				false,
			);

			const tasks = await core.filesystem.listTasks();
			expect(tasks).toHaveLength(3);

			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];
			expect(statuses).toEqual(["To Do", "In Progress", "Done"]);

			const { generateKanbanBoardWithMetadata } = await import("../board.ts");
			const board = generateKanbanBoardWithMetadata(tasks, statuses, "Test Project");

			expect(board).toContain("To Do");
			expect(board).toContain("In Progress");
			expect(board).toContain("Done");
			expect(board).toContain("TASK-1");
			expect(board).toContain("Todo Task");
			expect(board).toContain("TASK-2");
			expect(board).toContain("Progress Task");
			expect(board).toContain("TASK-3");
			expect(board).toContain("Done Task");

			const lines = board.split("\n");
			expect(board).toContain("# Kanban Board Export");
			expect(board).toContain("To Do");
			expect(board).toContain("In Progress");
			expect(board).toContain("Done");
			expect(board).toContain("|");
			expect(lines.length).toBeGreaterThan(5);
		});

		it("should handle empty project with default statuses", async () => {
			const core = new Core(TEST_DIR);

			const tasks = await core.filesystem.listTasks();
			expect(tasks).toHaveLength(0);

			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];

			const { generateKanbanBoardWithMetadata } = await import("../board.ts");
			const board = generateKanbanBoardWithMetadata(tasks, statuses, "Test Project");

			expect(board).toContain("# Kanban Board Export");
			expect(board).toContain("| To Do | In Progress | Done |");
			expect(board).toContain("No tasks found");
		});

		it("should support vertical layout option", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Todo Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-08",
					labels: [],
					dependencies: [],
					rawContent: "A task in todo",
				},
				false,
			);

			const tasks = await core.filesystem.listTasks();
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];

			const { generateKanbanBoardWithMetadata } = await import("../board.ts");
			const board = generateKanbanBoardWithMetadata(tasks, statuses, "Test Project");

			expect(board).toContain("# Kanban Board Export");
			expect(board).toContain("To Do");
			expect(board).toContain("TASK-1");
			expect(board).toContain("Todo Task");
		});

		it("should support --vertical shortcut flag", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Shortcut Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-09",
					labels: [],
					dependencies: [],
					rawContent: "Testing vertical shortcut",
				},
				false,
			);

			const tasks = await core.filesystem.listTasks();
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];

			const { generateKanbanBoardWithMetadata } = await import("../board.ts");
			const board = generateKanbanBoardWithMetadata(tasks, statuses, "Test Project");

			expect(board).toContain("# Kanban Board Export");
			expect(board).toContain("To Do");
			expect(board).toContain("TASK-1");
			expect(board).toContain("Shortcut Task");
		});

		it("should merge task status from remote branches", async () => {
			const core = new Core(TEST_DIR);

			const task = {
				id: "task-1",
				title: "Remote Task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-06-09",
				labels: [],
				dependencies: [],
				rawContent: "from remote",
			} as Task;

			await core.createTask(task, true);

			const remoteDir = join(TEST_DIR, "remote.git");
			await $`git init --bare -b main ${remoteDir}`.quiet();
			await $`git remote add origin ${remoteDir}`.cwd(TEST_DIR).quiet();
			await $`git push -u origin main`.cwd(TEST_DIR).quiet();

			await $`git checkout -b feature`.cwd(TEST_DIR).quiet();
			await core.updateTaskFromInput("task-1", { status: "Done" }, true);
			await $`git push -u origin feature`.cwd(TEST_DIR).quiet();

			await $`git remote update origin --prune`.cwd(TEST_DIR).quiet();

			await $`git checkout main`.cwd(TEST_DIR).quiet();

			await core.gitOps.fetch();
			const branches = await core.gitOps.listRemoteBranches();
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];

			const localTasks = await core.filesystem.listTasks();
			const tasksById = new Map(localTasks.map((t) => [t.id, t]));

			for (const branch of branches) {
				const ref = `origin/${branch}`;
				const files = await core.gitOps.listFilesInTree(ref, "backlog/tasks");
				for (const file of files) {
					const content = await core.gitOps.showFile(ref, file);
					const remoteTask = parseTask(content);
					const existing = tasksById.get(remoteTask.id);
					const currentIdx = existing ? statuses.indexOf(existing.status) : -1;
					const newIdx = statuses.indexOf(remoteTask.status);
					if (!existing || newIdx > currentIdx || currentIdx === -1 || newIdx === currentIdx) {
						tasksById.set(remoteTask.id, remoteTask);
					}
				}
			}

			const final = tasksById.get("TASK-1");
			expect(final?.status).toBe("Done");
		});

		// CLI-CONTRACT: verify board defaults to view when no subcommand
		it("should default to view when no subcommand is provided", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-99",
					title: "Default Cmd Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-10",
					labels: [],
					dependencies: [],
					rawContent: "test",
				},
				false,
			);

			const resultDefault = await $`bun ${["src/cli.ts", "board"]}`.cwd(TEST_DIR).quiet().nothrow();
			const resultView = await $`bun ${["src/cli.ts", "board", "view"]}`.cwd(TEST_DIR).quiet().nothrow();

			expect(resultDefault.stdout.toString()).toBe(resultView.stdout.toString());
		});

		it("should export kanban board to file", async () => {
			const core = new Core(TEST_DIR);

			await core.createTask(
				{
					id: "task-1",
					title: "Export Test Task",
					status: "To Do",
					assignee: [],
					createdDate: "2025-06-09",
					labels: [],
					dependencies: [],
					rawContent: "Testing board export",
				},
				false,
			);

			const { exportKanbanBoardToFile } = await import("../index.ts");
			const outputPath = join(TEST_DIR, "test-export.md");
			const tasks = await core.filesystem.listTasks();
			const config = await core.filesystem.loadConfig();
			const statuses = config?.statuses || [];

			await exportKanbanBoardToFile(tasks, statuses, outputPath, "TestProject");

			const content = await Bun.file(outputPath).text();
			expect(content).toContain("To Do");
			expect(content).toContain("TASK-1");
			expect(content).toContain("Export Test Task");
			expect(content).toContain("# Kanban Board Export (powered by Backlog.md)");
			expect(content).toContain("Project: TestProject");

			await exportKanbanBoardToFile(tasks, statuses, outputPath, "TestProject");
			const overwrittenContent = await Bun.file(outputPath).text();
			const occurrences = overwrittenContent.split("TASK-1").length - 1;
			expect(occurrences).toBe(1);
		});
	});
});
