import { describe, expect, it } from "bun:test";
import { getTaskLoadingMessage, resolveTaskConflict } from "../core/task-loader.ts";
import type { BacklogConfig, Task } from "../types/index.ts";
import { normalizeId } from "../utils/prefix-config.ts";

describe("getTaskLoadingMessage - edge cases", () => {
	it("returns remote message when config is null", () => {
		expect(getTaskLoadingMessage(null)).toBe("Loading tasks from local and remote branches...");
	});

	it("returns remote message when remoteOperations is undefined", () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: [],
			labels: [],
			milestones: [],
		};
		expect(getTaskLoadingMessage(config)).toBe("Loading tasks from local and remote branches...");
	});

	it("returns local-only when remoteOperations is explicitly false", () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: [],
			labels: [],
			milestones: [],
			remoteOperations: false,
		};
		expect(getTaskLoadingMessage(config)).toBe("Loading tasks from local branches...");
	});
});

describe("resolveTaskConflict - edge cases", () => {
	const statuses = ["To Do", "In Progress", "Done"];

	it("handles most_recent when both have no dates (equal epoch dates prefer existing)", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "In Progress",
			assignee: [],
			createdDate: "2025-01-02",
			labels: [],
			dependencies: [],
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_recent");
		// Both lack updatedDate and lastModified -> both resolve to new Date(0) -> existing wins on tie
		expect(result.title).toBe("Local");
	});

	it("uses lastModified when updatedDate is missing on one task", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			lastModified: new Date("2025-01-01"),
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "Done",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-02",
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Incoming");
	});

	it("prefers incoming when it has higher status rank even if local is newer", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-05",
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "Done",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-03",
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Incoming");
	});

	it("prefers existing when local has higher status rank", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "Done",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-01",
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-02",
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Local");
	});
});

describe("normalizeId with task prefix", () => {
	it("normalizes IDs with default task prefix", () => {
		const id = normalizeId("task-123", "task");
		expect(id).toBe("TASK-123");
	});

	it("normalizes IDs with custom prefix", () => {
		const id = normalizeId("back-456", "back");
		expect(id).toBe("BACK-456");
	});

	it("normalizes IDs without prefix by adding the default", () => {
		const id = normalizeId("789", "task");
		expect(id).toBe("TASK-789");
	});
});

describe("chooseWinners - strategy edge cases (via loadRemoteTasks with mocked git)", () => {
	it("handles empty remote index", async () => {
		// When no winners are found, hydrateTasks returns []
		// Tested via loadRemoteTasks with empty results
		const mockGit = {
			fetch: async () => {},
			listRecentRemoteBranches: async () => ["main"],
			listFilesInTree: async () => [],
			getBranchLastModifiedMap: async () => new Map(),
		} as never;

		const { loadRemoteTasks } = await import("../core/task-loader.ts");
		const tasks = await loadRemoteTasks(mockGit);
		expect(tasks).toEqual([]);
	});
});
