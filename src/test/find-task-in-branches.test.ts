import { beforeEach, describe, expect, it } from "bun:test";
import { findTaskInLocalBranches, findTaskInRemoteBranches } from "../core/task-loader.ts";
import type { GitOperations } from "../git/operations.ts";

type PartialGitOps = Partial<GitOperations>;

const mockTaskContent = `---
id: task-123
title: Test Task
status: To Do
assignee: []
created_date: '2025-01-01 12:00'
labels: []
dependencies: []
---

## Description

Test description
`;

const mockLocalContent = `---
id: task-456
title: Local Branch Task
status: In Progress
assignee: []
created_date: '2025-01-01 12:00'
labels: []
dependencies: []
---

## Description

From local branch
`;

describe("findTaskInRemoteBranches", () => {
	let mockGitBase: PartialGitOps;

	beforeEach(() => {
		mockGitBase = {
			hasAnyRemote: async () => true,
			listRecentRemoteBranches: async () => ["main"],
			listFilesInTree: async () => ["backlog/tasks/task-1 - some task.md"],
			getBranchLastModifiedMap: async () => new Map([["backlog/tasks/task-1 - some task.md", new Date()]]),
			showFile: async () => "",
			resolveCommit: async () => "abc123",
		};
	});

	it("should return null when git has no remotes", async () => {
		const mockGit: PartialGitOps = { ...mockGitBase, hasAnyRemote: async () => false };
		const result = await findTaskInRemoteBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
	});

	it("should return null when no branches exist", async () => {
		const mockGit: PartialGitOps = { ...mockGitBase, listRecentRemoteBranches: async () => [] };
		const result = await findTaskInRemoteBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
	});

	it("should return null when task is not in any branch", async () => {
		const result = await findTaskInRemoteBranches(mockGitBase as GitOperations, "task-999");
		expect(result).toBeNull();
	});

	it("should find and load task from remote branch", async () => {
		const mockGit: PartialGitOps = {
			...mockGitBase,
			listRecentRemoteBranches: async () => ["feature"],
			listFilesInTree: async () => ["backlog/tasks/task-123 - Test Task.md"],
			getBranchLastModifiedMap: async () =>
				new Map([["backlog/tasks/task-123 - Test Task.md", new Date("2025-01-01")]]),
			showFile: async () => mockTaskContent,
		};

		const result = await findTaskInRemoteBranches(mockGit as GitOperations, "task-123");
		expect(result).not.toBeNull();
		expect(result?.id).toBe("TASK-123");
		expect(result?.source).toBe("remote");
		expect(result?.branch).toBe("feature");
	});
});

describe("findTaskInLocalBranches", () => {
	let mockGitBase: PartialGitOps;

	beforeEach(() => {
		mockGitBase = {
			getCurrentBranch: async () => "main",
			listRecentBranches: async () => ["main", "feature-branch"],
			listFilesInTree: async () => ["backlog/tasks/task-456 - Local Branch Task.md"],
			getBranchLastModifiedMap: async () =>
				new Map([["backlog/tasks/task-456 - Local Branch Task.md", new Date("2025-01-01")]]),
			showFile: async () => mockLocalContent,
			resolveCommit: async () => "abc123",
		};
	});

	it("should return null when on detached HEAD", async () => {
		const mockGit: PartialGitOps = { ...mockGitBase, getCurrentBranch: async () => "" };
		const result = await findTaskInLocalBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
	});

	it("should return null when only current branch exists", async () => {
		const mockGit: PartialGitOps = { ...mockGitBase, listRecentBranches: async () => ["main"] };
		const result = await findTaskInLocalBranches(mockGit as GitOperations, "task-999");
		expect(result).toBeNull();
	});

	it("should find and load task from another local branch", async () => {
		const result = await findTaskInLocalBranches(mockGitBase as GitOperations, "task-456");
		expect(result).not.toBeNull();
		expect(result?.id).toBe("TASK-456");
		expect(result?.source).toBe("local-branch");
		expect(result?.branch).toBe("feature-branch");
	});
});
