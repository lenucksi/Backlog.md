import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import {
	buildLocalBranchTaskIndex,
	findTaskInLocalBranches,
	findTaskInRemoteBranches,
	getTaskLoadingMessage,
	loadLocalBranchTasks,
	loadRemoteTasks,
	resolveTaskConflict,
} from "../core/task-loader.ts";
import type { GitOperations } from "../git/operations.ts";
import type { BacklogConfig, Task } from "../types/index.ts";

describe("getTaskLoadingMessage", () => {
	it("returns local-only message when remoteOperations is false", () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: [],
			labels: [],
			milestones: [],
			remoteOperations: false,
		};
		expect(getTaskLoadingMessage(config)).toBe("Loading tasks from local branches...");
	});

	it("returns remote message when remoteOperations is true or config is null", () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: [],
			labels: [],
			milestones: [],
			remoteOperations: true,
		};
		expect(getTaskLoadingMessage(config)).toBe("Loading tasks from local and remote branches...");
		expect(getTaskLoadingMessage(null)).toBe("Loading tasks from local and remote branches...");
	});
});

describe("buildLocalBranchTaskIndex - branch normalization", () => {
	it("returns empty map when branches list is empty", async () => {
		const mockGit = {} as unknown as GitOperations;
		const index = await buildLocalBranchTaskIndex(mockGit, [], "main");
		expect(index.size).toBe(0);
	});

	it("filters out HEAD, origin, and prefixed refs from local branch list", async () => {
		const mockGit = {
			listFilesInTree: async () => ["backlog/tasks/task-1 - Test.md"],
			getBranchLastModifiedMap: async () => new Map(),
		} as unknown as GitOperations;

		const index = await buildLocalBranchTaskIndex(
			mockGit,
			["main", "HEAD", "origin", "origin/main", "refs/remotes/origin/feature", ""],
			"main",
		);
		expect(index.size).toBe(0);
	});
});

describe("findTaskInRemoteBranches - error handling", () => {
	let debugEnv: string | undefined;

	beforeEach(() => {
		debugEnv = process.env.DEBUG;
	});

	afterEach(() => {
		if (debugEnv === undefined) {
			delete process.env.DEBUG;
		} else {
			process.env.DEBUG = debugEnv;
		}
	});

	it("returns null and logs debug when error occurs and DEBUG is set", async () => {
		process.env.DEBUG = "1";
		const consoleErrorSpy = spyOn(console, "error");

		const mockGit = {
			hasAnyRemote: async () => {
				throw new Error("Unexpected error");
			},
		} as unknown as GitOperations;

		const result = await findTaskInRemoteBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});

	it("returns null silently when error occurs and DEBUG is not set", async () => {
		delete process.env.DEBUG;
		const consoleErrorSpy = spyOn(console, "error");

		const mockGit = {
			hasAnyRemote: async () => {
				throw new Error("Unexpected error");
			},
		} as unknown as GitOperations;

		const result = await findTaskInRemoteBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});
});

describe("findTaskInLocalBranches - error handling", () => {
	let debugEnv: string | undefined;

	beforeEach(() => {
		debugEnv = process.env.DEBUG;
	});

	afterEach(() => {
		if (debugEnv === undefined) {
			delete process.env.DEBUG;
		} else {
			process.env.DEBUG = debugEnv;
		}
	});

	it("returns null and logs debug when error occurs and DEBUG is set", async () => {
		process.env.DEBUG = "1";
		const consoleErrorSpy = spyOn(console, "error");

		const mockGit = {
			getCurrentBranch: async () => {
				throw new Error("Git error");
			},
		} as unknown as GitOperations;

		const result = await findTaskInLocalBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});

	it("returns null silently when error occurs and DEBUG is not set", async () => {
		delete process.env.DEBUG;
		const consoleErrorSpy = spyOn(console, "error");

		const mockGit = {
			getCurrentBranch: async () => {
				throw new Error("Git error");
			},
		} as unknown as GitOperations;

		const result = await findTaskInLocalBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
		expect(consoleErrorSpy).not.toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});
});

describe("resolveTaskConflict - edge cases", () => {
	const statuses = ["To Do", "In Progress", "Done"];

	it("uses lastModified as fallback when updatedDate is missing on both tasks", () => {
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
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-02",
			labels: [],
			dependencies: [],
			lastModified: new Date("2025-01-02"),
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Incoming");
	});

	it("prefers existing when both have equal status and local is newer", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "In Progress",
			assignee: [],
			createdDate: "2025-01-02",
			labels: [],
			dependencies: [],
			lastModified: new Date("2025-01-02"),
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "In Progress",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			lastModified: new Date("2025-01-01"),
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Local");
	});

	it("returns existing when incoming has less progress and no date info", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "In Progress",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Local");
	});

	it("handles unknown statuses by defaulting rank to 0 for both", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "Unknown",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "Unknown",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_progressed");
		expect(result.title).toBe("Local");
	});

	it("most_recent strategy picks the newer task by updatedDate", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-02",
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
		const result = resolveTaskConflict(local, incoming, statuses, "most_recent");
		expect(result.title).toBe("Incoming");
	});

	it("most_recent strategy picks existing when incoming is older", () => {
		const local: Task = {
			id: "task-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-02",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-03",
		};
		const incoming: Task = {
			id: "task-1",
			title: "Incoming",
			status: "Done",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-01",
		};
		const result = resolveTaskConflict(local, incoming, statuses, "most_recent");
		expect(result.title).toBe("Local");
	});
});

describe("loadRemoteTasks - edge cases", () => {
	let consoleErrorSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		consoleErrorSpy = spyOn(console, "error");
	});

	afterEach(() => {
		consoleErrorSpy?.mockRestore();
	});

	it("handles error during fetch gracefully", async () => {
		const errorMock = {
			fetch: async () => {
				throw new Error("Fetch error");
			},
			listRecentRemoteBranches: async () => {
				throw new Error("Fetch error");
			},
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(errorMock);
		expect(tasks).toEqual([]);
		expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch remote tasks:", "Fetch error");
	});

	it("reports when no recent remote branches are found", async () => {
		const progressMessages: string[] = [];
		const mockGit = {
			fetch: async () => {},
			listRecentRemoteBranches: async () => [],
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(mockGit, null, (m) => progressMessages.push(m));
		expect(tasks).toEqual([]);
		expect(progressMessages).toContain("No recent remote branches found");
	});

	it("reports when no remote tasks are found after indexing", async () => {
		const progressMessages: string[] = [];
		const mockGit = {
			fetch: async () => {},
			listRecentRemoteBranches: async () => ["main"],
			listFilesInTree: async () => [],
			getBranchLastModifiedMap: async () => new Map(),
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(mockGit, null, (m) => progressMessages.push(m));
		expect(tasks).toEqual([]);
		expect(progressMessages).toContain("No remote tasks found");
	});

	it("loads all remote tasks with hydration when no local tasks provided", async () => {
		const progressMessages: string[] = [];
		const mockGit = {
			fetch: async () => {},
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			listRecentRemoteBranches: async () => ["feature"],
			listFilesInTree: async () => ["backlog/tasks/task-1 - Test.md"],
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1 - Test.md", new Date("2025-01-01")]]),
			showFile: async () => `---
id: task-1
title: Test
status: To Do
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`,
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(mockGit, null, (m) => progressMessages.push(m));
		expect(tasks.length).toBe(1);
		expect(tasks[0]?.id).toBe("TASK-1");
		expect(progressMessages.some((m) => m.includes("Hydrating 1 remote tasks"))).toBe(true);
	});

	it("loads remote tasks with stateCollector and includeCompleted", async () => {
		const collector: Array<{ id: string; type: string; branch: string; path: string; lastModified: Date }> = [];
		const progressMessages: string[] = [];
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: [],
			labels: [],
			milestones: [],
		};
		const mockGit = {
			fetch: async () => {},
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			listRecentRemoteBranches: async () => ["feature"],
			listFilesInTree: async () => ["backlog/tasks/task-1 - Active.md", "backlog/completed/task-2 - Done.md"],
			getBranchLastModifiedMap: async () =>
				new Map([
					["backlog/tasks/task-1 - Active.md", new Date("2025-01-01")],
					["backlog/completed/task-2 - Done.md", new Date("2025-01-01")],
				]),
			showFile: async (_ref: string, file: string) => {
				if (file.includes("task-1")) {
					return `---
id: task-1
title: Active
status: To Do
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`;
				}
				return `---
id: task-2
title: Done
status: Done
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`;
			},
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(
			mockGit,
			config,
			(m) => progressMessages.push(m),
			undefined,
			collector as any,
			true,
		);
		expect(tasks.length).toBe(2);
		expect(collector.length).toBe(2);
	});

	it("hydrates specific remote candidates when local tasks exist", async () => {
		const progressMessages: string[] = [];
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
		};
		const localTask: Task = {
			id: "TASK-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-01",
		};
		const mockGit = {
			fetch: async () => {},
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			listRecentRemoteBranches: async () => ["feature"],
			listFilesInTree: async () => ["backlog/tasks/task-1 - Remote.md"],
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1 - Remote.md", new Date("2025-01-05")]]),
			showFile: async () => `---
id: task-1
title: Remote Updated
status: In Progress
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`,
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(mockGit, config, (m) => progressMessages.push(m), [localTask]);
		expect(tasks.length).toBe(1);
		expect(tasks[0]?.title).toBe("Remote Updated");
		expect(progressMessages.some((m) => m.includes("Hydrating 1 remote candidates"))).toBe(true);
	});

	it("uses most_recent strategy when configured", async () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			taskResolutionStrategy: "most_recent",
		};
		const localTask: Task = {
			id: "TASK-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-01",
		};
		const mockGit = {
			fetch: async () => {},
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			listRecentRemoteBranches: async () => ["feature"],
			listFilesInTree: async () => ["backlog/tasks/task-1 - Remote.md"],
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1 - Remote.md", new Date("2025-01-05")]]),
			showFile: async () => `---
id: task-1
title: Remote Newer
status: To Do
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`,
		} as unknown as GitOperations;

		const tasks = await loadRemoteTasks(mockGit, config, undefined, [localTask]);
		expect(tasks.length).toBe(1);
		expect(tasks[0]?.title).toBe("Remote Newer");
	});
});

describe("loadLocalBranchTasks - edge cases", () => {
	let consoleDebugSpy: ReturnType<typeof spyOn>;
	let consoleErrorSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		consoleDebugSpy = spyOn(console, "debug");
		consoleErrorSpy = spyOn(console, "error");
	});

	afterEach(() => {
		consoleDebugSpy?.mockRestore();
		consoleErrorSpy?.mockRestore();
	});

	it("handles errors gracefully without DEBUG", async () => {
		delete process.env.DEBUG;
		const mockGit = {
			getCurrentBranch: async () => {
				throw new Error("Branch error");
			},
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit);
		expect(tasks).toEqual([]);
		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it("handles errors gracefully with DEBUG", async () => {
		process.env.DEBUG = "1";
		const mockGit = {
			getCurrentBranch: async () => {
				throw new Error("Branch error");
			},
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit);
		expect(tasks).toEqual([]);
		expect(consoleErrorSpy).toHaveBeenCalled();

		delete process.env.DEBUG;
	});

	it("returns empty when filtered branches leave only the current branch", async () => {
		const mockGit = {
			getCurrentBranch: async () => "main",
			listRecentBranches: async () => ["main", "origin/main", "refs/remotes/origin/feature", "origin"],
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit);
		expect(tasks).toEqual([]);
	});

	it("returns empty when winners list is empty after choosing with newer local tasks", async () => {
		const localTask: Task = {
			id: "TASK-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-02",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-02",
		};

		const mockGit = {
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			getCurrentBranch: async () => "main",
			listRecentBranches: async () => ["main", "feature-a"],
			listFilesInTree: async (ref: string) => {
				if (ref === "feature-a") return ["backlog/tasks/task-1 - Same.md"];
				return [];
			},
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1 - Same.md", new Date("2025-01-01")]]),
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit, null, undefined, [localTask]);
		expect(tasks).toEqual([]);
	});

	it("hydrates all tasks when no local tasks are provided", async () => {
		const mockGit = {
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			getCurrentBranch: async () => "main",
			listRecentBranches: async () => ["main", "feature-a"],
			listFilesInTree: async (ref: string) => {
				if (ref === "feature-a") return ["backlog/tasks/task-2 - Other.md"];
				return [];
			},
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-2 - Other.md", new Date("2025-01-01")]]),
			showFile: async () => `---
id: task-2
title: Other Branch Task
status: To Do
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`,
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit);
		expect(tasks.length).toBe(1);
		expect(tasks[0]?.id).toBe("TASK-2");
		expect(tasks[0]?.source).toBe("local-branch");
	});

	it("hydrates missing tasks when local tasks don't match remote entries", async () => {
		const localTask: Task = {
			id: "TASK-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
		};

		const mockGit = {
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			getCurrentBranch: async () => "main",
			listRecentBranches: async () => ["main", "feature-a"],
			listFilesInTree: async (ref: string) => {
				if (ref === "feature-a") return ["backlog/tasks/task-3 - New.md"];
				return [];
			},
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-3 - New.md", new Date("2025-01-01")]]),
			showFile: async () => `---
id: task-3
title: New From Branch
status: To Do
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`,
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit, null, undefined, [localTask]);
		expect(tasks.length).toBe(1);
		expect(tasks[0]?.id).toBe("TASK-3");
	});

	it("uses most_recent strategy when configured", async () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			taskResolutionStrategy: "most_recent",
		};
		const localTask: Task = {
			id: "TASK-1",
			title: "Local",
			status: "To Do",
			assignee: [],
			createdDate: "2025-01-01",
			labels: [],
			dependencies: [],
			updatedDate: "2025-01-01",
		};

		const mockGit = {
			resolveCommit: async (ref: string) => `mock-sha-${ref}`,
			getCurrentBranch: async () => "main",
			listRecentBranches: async () => ["main", "feature-a"],
			listFilesInTree: async (ref: string) => {
				if (ref === "feature-a") return ["backlog/tasks/task-1 - Newer.md"];
				return [];
			},
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1 - Newer.md", new Date("2025-01-05")]]),
			showFile: async () => `---
id: task-1
title: Newer Version
status: To Do
assignee: []
created_date: 2025-01-01
labels: []
dependencies: []
---`,
		} as unknown as GitOperations;

		const tasks = await loadLocalBranchTasks(mockGit, config, undefined, [localTask]);
		expect(tasks.length).toBe(1);
		expect(tasks[0]?.title).toBe("Newer Version");
	});
});
