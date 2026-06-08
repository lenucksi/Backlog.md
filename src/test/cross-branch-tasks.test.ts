import { describe, expect, it, spyOn } from "bun:test";
import type { TaskDirectoryInfo } from "../core/cross-branch-tasks.ts";
import { filterTasksByLatestState, getLatestTaskStatesForIds } from "../core/cross-branch-tasks.ts";
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
		expect(result[0]?.id).toBe("2");
	});
});

describe("getLatestTaskStatesForIds", () => {
	type GitOpsMock = {
		listRecentBranches: (days: number) => Promise<string[]>;
		listAllBranches: () => Promise<string[]>;
		listFilesInTree: (branch: string, path: string) => Promise<string[]>;
		getBranchLastModifiedMap: (branch: string, path: string) => Promise<Map<string, Date>>;
		getCurrentBranch: () => Promise<string>;
	};

	const makeGitOps = (overrides: Partial<GitOpsMock> = {}): GitOpsMock => ({
		listRecentBranches: async () => [],
		listAllBranches: async () => [],
		listFilesInTree: async () => [],
		getBranchLastModifiedMap: async () => new Map(),
		getCurrentBranch: async () => "main",
		...overrides,
	});

	const makeFilesystem = (backlogDirName = "backlog") => ({
		backlogDirName,
	});

	/** Helper to create listFilesInTree that includes backlog root check */
	const withBacklogRoot = (
		listFilesInTree: (branch: string, path: string) => Promise<string[]>,
	): ((branch: string, path: string) => Promise<string[]>) => {
		return async (branch: string, path: string) => {
			if (path === "backlog") return ["backlog/tasks"];
			return listFilesInTree(branch, path);
		};
	};

	const progressSpy = () => spyOn({ fn: (_msg: string) => {} }, "fn");

	it("returns empty map for empty taskIds", async () => {
		const result = await getLatestTaskStatesForIds(makeGitOps() as never, makeFilesystem() as never, []);
		expect(result.size).toBe(0);
	});

	it("returns empty map when no branches found", async () => {
		const gitOps = makeGitOps({ listRecentBranches: async () => [] });
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(0);
	});

	it("returns empty map when branches have no backlog directory", async () => {
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: async () => [],
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(0);
	});

	it("finds tasks in priority branch (main)", async () => {
		const now = new Date();
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/tasks") return ["backlog/tasks/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1.md", now]]),
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(1);
		expect(result.get("task-1")?.type).toBe("task");
		expect(result.get("task-1")?.branch).toBe("main");
	});

	it("prefers current branch over main (priority order: current first)", async () => {
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main", "feature-x"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/tasks") return ["backlog/tasks/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async (branch: string) => {
				const date = branch === "main" ? new Date("2026-01-01") : new Date("2026-06-01");
				return new Map([["backlog/tasks/task-1.md", date]]);
			},
			getCurrentBranch: async () => "feature-x",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(1);
		expect(result.get("task-1")?.branch).toBe("feature-x");
	});

	it("uses newer modified date when same task exists in multiple branches", async () => {
		const oldDate = new Date("2026-01-01");
		const newDate = new Date("2026-06-01");
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main", "feature-b"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/tasks") return ["backlog/tasks/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async (_branch: string) => {
				return new Map([["backlog/tasks/task-1.md", _branch === "main" ? oldDate : newDate]]);
			},
			getCurrentBranch: async () => "feature-b",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(1);
	});

	it("calls onProgress with status messages", async () => {
		const progress = progressSpy();
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/tasks") return ["backlog/tasks/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1.md", new Date()]]),
			getCurrentBranch: async () => "main",
		});
		await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"], progress);
		expect(progress).toHaveBeenCalled();
	});

	it("handles error from listFilesInTree during backlog dir check gracefully (skips branch)", async () => {
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: async () => {
				throw new Error("git error");
			},
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(0);
	});

	it("handles error from listRecentBranches gracefully", async () => {
		const gitOps = makeGitOps({
			listRecentBranches: async () => {
				throw new Error("git error");
			},
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(0);
	});

	it("handles custom prefix option", async () => {
		const now = new Date();
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/tasks") return ["backlog/tasks/BACK-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/BACK-1.md", now]]),
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["BACK-1"], undefined, {
			prefix: "BACK",
		});
		expect(result.size).toBe(1);
	});

	it("uses listAllBranches when recentBranchesOnly is false", async () => {
		const gitOps = makeGitOps({
			listAllBranches: async () => ["main"],
			listRecentBranches: async () => [],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/tasks") return ["backlog/tasks/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1.md", new Date()]]),
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"], undefined, {
			recentBranchesOnly: false,
		});
		expect(result.size).toBe(1);
	});

	it("finds tasks in draft directory", async () => {
		const now = new Date();
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/drafts") return ["backlog/drafts/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/drafts/task-1.md", now]]),
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(1);
		expect(result.get("task-1")?.type).toBe("draft");
	});

	it("finds tasks in archive directory", async () => {
		const now = new Date();
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/archive/tasks") return ["backlog/archive/tasks/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/archive/tasks/task-1.md", now]]),
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(1);
		expect(result.get("task-1")?.type).toBe("archived");
	});

	it("finds tasks in completed directory", async () => {
		const now = new Date();
		const gitOps = makeGitOps({
			listRecentBranches: async () => ["main"],
			listFilesInTree: withBacklogRoot(async (_branch: string, path: string) => {
				if (path === "backlog/completed") return ["backlog/completed/task-1.md"];
				return [];
			}),
			getBranchLastModifiedMap: async () => new Map([["backlog/completed/task-1.md", now]]),
			getCurrentBranch: async () => "main",
		});
		const result = await getLatestTaskStatesForIds(gitOps as never, makeFilesystem() as never, ["task-1"]);
		expect(result.size).toBe(1);
		expect(result.get("task-1")?.type).toBe("completed");
	});
});
