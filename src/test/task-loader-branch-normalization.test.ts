import { describe, expect, it } from "bun:test";
import { buildRemoteTaskIndex } from "../core/task-loader.ts";
import type { GitOperations } from "../git/operations.ts";

class MockGit implements Partial<GitOperations> {
	public refs: string[] = [];

	async listFilesInTree(ref: string, _path: string): Promise<string[]> {
		this.refs.push(ref);
		return ["backlog/tasks/task-1 - Test.md"];
	}

	async getBranchLastModifiedMap(_ref: string, _path: string): Promise<Map<string, Date>> {
		return new Map([["backlog/tasks/task-1 - Test.md", new Date()]]);
	}
}

describe("buildRemoteTaskIndex branch handling", () => {
	it("normalizes various branch forms to canonical refs", async () => {
		const git = new MockGit();
		await buildRemoteTaskIndex(git as unknown as GitOperations, ["main", "origin/main", "refs/remotes/origin/main"]);
		expect(git.refs).toEqual(["origin/main", "origin/main", "origin/main"]);
	});

	it("filters out invalid branch entries", async () => {
		const git = new MockGit();
		await buildRemoteTaskIndex(git as unknown as GitOperations, [
			"main",
			"origin",
			"origin/HEAD",
			"HEAD",
			"origin/origin",
			"refs/remotes/origin/origin",
		]);
		expect(git.refs).toEqual(["origin/main"]);
	});

	it("classifies task type from path", async () => {
		const collector: Array<{ id: string; type: string; branch: string; path: string; lastModified: Date }> = [];
		const git = new MockGit();

		await buildRemoteTaskIndex(git as unknown as GitOperations, ["main"], "backlog", undefined, collector as any);

		expect(collector.length).toBeGreaterThan(0);
		const first = collector[0]!;
		expect(first.type).toBe("task");
		expect(first.branch).toBe("main");
	});

	it("indexes completed tasks when includeCompleted + stateCollector are set", async () => {
		const collector: Array<{ id: string; type: string; branch: string; path: string; lastModified: Date }> = [];
		const git = {
			refs: [] as string[],
			async listFilesInTree(_ref: string, _path: string): Promise<string[]> {
				return ["backlog/completed/task-99 - Done.md", "backlog/tasks/task-1 - Active.md"];
			},
			async getBranchLastModifiedMap(_ref: string, _path: string): Promise<Map<string, Date>> {
				return new Map([
					["backlog/completed/task-99 - Done.md", new Date()],
					["backlog/tasks/task-1 - Active.md", new Date()],
				]);
			},
		};

		const index = await buildRemoteTaskIndex(
			git as unknown as GitOperations,
			["main"],
			"backlog",
			undefined,
			collector as any,
			"task",
			true,
		);
		expect(index.size).toBeGreaterThan(0);
		expect(collector.length).toBe(2);
	});

	it("skips non-task files when no stateCollector", async () => {
		const git = {
			refs: [] as string[],
			async listFilesInTree(_ref: string, _path: string): Promise<string[]> {
				return ["backlog/docs/readme.md"];
			},
			async getBranchLastModifiedMap(_ref: string, _path: string): Promise<Map<string, Date>> {
				return new Map([["backlog/docs/readme.md", new Date()]]);
			},
		};

		const index = await buildRemoteTaskIndex(git as unknown as GitOperations, ["main"]);
		expect(index.size).toBe(0);
	});
});
