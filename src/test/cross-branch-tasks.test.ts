import { describe, expect, it } from "bun:test";
import type { TaskDirectoryInfo } from "../core/cross-branch-tasks.ts";
import { filterTasksByLatestState } from "../core/cross-branch-tasks.ts";
import type { Task } from "../types/index.ts";

describe("filterTasksByLatestState", () => {
	const makeTask = (id: string, status = "To Do"): Task => ({
		id,
		title: `Task ${id}`,
		status,
		assignee: [],
		createdDate: "2026-01-01",
		labels: [],
		dependencies: [],
	});

	it("keeps tasks with no directory info", () => {
		const tasks = [makeTask("1"), makeTask("2")];
		const dirs = new Map<string, TaskDirectoryInfo>();
		const result = filterTasksByLatestState(tasks, dirs);
		expect(result).toHaveLength(2);
	});

	it("keeps tasks with type 'task'", () => {
		const tasks = [makeTask("1")];
		const dirs = new Map<string, TaskDirectoryInfo>([
			["1", { taskId: "1", type: "task", lastModified: new Date(), branch: "main", path: "backlog/tasks/task-1.md" }],
		]);
		const result = filterTasksByLatestState(tasks, dirs);
		expect(result).toHaveLength(1);
	});

	it("filters out completed tasks", () => {
		const tasks = [makeTask("1")];
		const dirs = new Map<string, TaskDirectoryInfo>([
			[
				"1",
				{
					taskId: "1",
					type: "completed",
					lastModified: new Date(),
					branch: "main",
					path: "backlog/completed/task-1.md",
				},
			],
		]);
		const result = filterTasksByLatestState(tasks, dirs);
		expect(result).toHaveLength(0);
	});

	it("filters out archived tasks", () => {
		const tasks = [makeTask("1")];
		const dirs = new Map<string, TaskDirectoryInfo>([
			[
				"1",
				{
					taskId: "1",
					type: "archived",
					lastModified: new Date(),
					branch: "main",
					path: "backlog/archive/tasks/task-1.md",
				},
			],
		]);
		const result = filterTasksByLatestState(tasks, dirs);
		expect(result).toHaveLength(0);
	});

	it("filters out draft tasks", () => {
		const tasks = [makeTask("1")];
		const dirs = new Map<string, TaskDirectoryInfo>([
			["1", { taskId: "1", type: "draft", lastModified: new Date(), branch: "main", path: "backlog/drafts/task-1.md" }],
		]);
		const result = filterTasksByLatestState(tasks, dirs);
		expect(result).toHaveLength(0);
	});

	it("keeps active tasks but filters completed", () => {
		const tasks = [makeTask("1"), makeTask("2")];
		const dirs = new Map<string, TaskDirectoryInfo>([
			[
				"1",
				{
					taskId: "1",
					type: "completed",
					lastModified: new Date(),
					branch: "main",
					path: "backlog/completed/task-1.md",
				},
			],
			["2", { taskId: "2", type: "task", lastModified: new Date(), branch: "main", path: "backlog/tasks/task-2.md" }],
		]);
		const result = filterTasksByLatestState(tasks, dirs);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("2");
	});
});
