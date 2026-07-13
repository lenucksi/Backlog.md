import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import type { Milestone } from "../types/index.ts";
import {
	resolveFilterExitPane,
	resolveSearchExitTargetIndex,
	resolveTaskListSelection,
	shouldMoveFromDetailBoundaryToSearch,
	shouldMoveFromListBoundaryToSearch,
} from "../ui/task-viewer-state.ts";
import { buildTaskViewerMilestoneFilterModel } from "../ui/task-viewer-with-search.ts";
import { term } from "./termless-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function milestone(id: string, title: string): Milestone {
	return { id, title, description: "", rawContent: "" };
}

// ---------------------------------------------------------------------------
// Existing exported function edge-cases
// ---------------------------------------------------------------------------
describe("shouldMoveFromListBoundaryToSearch edge cases", () => {
	it("returns false for negative tasks", () => {
		expect(shouldMoveFromListBoundaryToSearch("up", 0, -1)).toBe(false);
	});

	it("returns false when selected index is inside the list", () => {
		expect(shouldMoveFromListBoundaryToSearch("up", 1, 5)).toBe(false);
		expect(shouldMoveFromListBoundaryToSearch("down", 2, 5)).toBe(false);
	});

	it("returns false when going down at first item", () => {
		expect(shouldMoveFromListBoundaryToSearch("down", 0, 5)).toBe(false);
	});

	it("returns true when going down at last item", () => {
		expect(shouldMoveFromListBoundaryToSearch("down", 4, 5)).toBe(true);
	});

	it("returns true when going up at first item", () => {
		expect(shouldMoveFromListBoundaryToSearch("up", 0, 5)).toBe(true);
	});
});

describe("shouldMoveFromDetailBoundaryToSearch edge cases", () => {
	it("only triggers on up direction", () => {
		expect(shouldMoveFromDetailBoundaryToSearch("down", 0)).toBe(false);
		expect(shouldMoveFromDetailBoundaryToSearch("down", -1)).toBe(false);
	});

	it("does not trigger when scrolled past top", () => {
		expect(shouldMoveFromDetailBoundaryToSearch("up", 5)).toBe(false);
	});

	it("triggers when at top boundary scrolling up", () => {
		expect(shouldMoveFromDetailBoundaryToSearch("up", 0)).toBe(true);
	});
});

describe("resolveSearchExitTargetIndex edge cases", () => {
	it("returns undefined when totalTasks is zero", () => {
		expect(resolveSearchExitTargetIndex("up", null, 0, undefined)).toBeUndefined();
		expect(resolveSearchExitTargetIndex("down", "to-first", 0, 0)).toBeUndefined();
	});

	it("returns undefined when totalTasks is negative", () => {
		expect(resolveSearchExitTargetIndex("up", null, -1, 0)).toBeUndefined();
		expect(resolveSearchExitTargetIndex("down", null, -5, undefined)).toBeUndefined();
	});

	it("returns last index when wrapping to-last", () => {
		expect(resolveSearchExitTargetIndex("up", "to-last", 5, 2)).toBe(4);
	});

	it("returns first index when wrapping to-first", () => {
		expect(resolveSearchExitTargetIndex("down", "to-first", 5, 2)).toBe(0);
	});

	it("preserves current index when no wrap", () => {
		expect(resolveSearchExitTargetIndex("up", null, 5, 1)).toBe(1);
		expect(resolveSearchExitTargetIndex("down", null, 5, 3)).toBe(3);
		expect(resolveSearchExitTargetIndex("escape", null, 5, 0)).toBe(0);
	});

	it("preserves undefined currentIndex when no wrap", () => {
		expect(resolveSearchExitTargetIndex("up", null, 5, undefined)).toBeUndefined();
	});
});

describe("resolveFilterExitPane edge cases", () => {
	it("returns detail when preferred and available", () => {
		expect(resolveFilterExitPane("detail", false, true)).toBe("detail");
	});

	it("returns list when preferred detail is not available", () => {
		expect(resolveFilterExitPane("detail", true, false)).toBe("list");
	});

	it("falls back to list when preferred list is not available", () => {
		expect(resolveFilterExitPane("list", false, true)).toBe("detail");
	});

	it("returns null when no pane available", () => {
		expect(resolveFilterExitPane("list", false, false)).toBeNull();
		expect(resolveFilterExitPane("detail", false, false)).toBeNull();
	});
});

describe("resolveTaskListSelection edge cases", () => {
	it("returns fallback when items is empty", () => {
		const fallback = { id: "FALLBACK" };
		expect(resolveTaskListSelection([], 0, fallback)).toBe(fallback);
	});

	it("returns fallback when selection index is undefined", () => {
		const items = [{ id: "T-1" }];
		expect(resolveTaskListSelection(items, undefined, null)).toBeNull();
	});

	it("returns fallback when selection array is empty", () => {
		const items = [{ id: "T-1" }];
		expect(resolveTaskListSelection(items, [], null)).toBeNull();
	});

	it("uses first element from array selection", () => {
		const items = [{ id: "T-1" }, { id: "T-2" }];
		expect(resolveTaskListSelection(items, [1])?.id).toBe("T-2");
	});

	it("returns fallback when index is out of range", () => {
		const items = [{ id: "T-1" }];
		expect(resolveTaskListSelection(items, 5, null)).toBeNull();
		expect(resolveTaskListSelection(items, -1, null)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// buildTaskViewerMilestoneFilterModel
// ---------------------------------------------------------------------------
describe("buildTaskViewerMilestoneFilterModel", () => {
	it("returns available milestone titles", () => {
		const { availableMilestoneTitles } = buildTaskViewerMilestoneFilterModel([
			milestone("m-1", "Sprint 1"),
			milestone("m-2", "Sprint 2"),
		]);
		expect(availableMilestoneTitles).toEqual(["Sprint 1", "Sprint 2"]);
	});

	it("resolves milestone by exact title", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-1", "Sprint 1")]);
		expect(resolveMilestoneLabel("Sprint 1")).toBe("Sprint 1");
	});

	it("resolves milestone by case-insensitive title", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-1", "Sprint 1")]);
		expect(resolveMilestoneLabel("sprint 1")).toBe("Sprint 1");
		expect(resolveMilestoneLabel("SPRINT 1")).toBe("Sprint 1");
	});

	it("resolves milestone by id string", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-42", "Release 2.0")]);
		expect(resolveMilestoneLabel("m-42")).toBe("Release 2.0");
	});

	it("resolves milestone by numeric alias", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-7", "Bug Fix Week")]);
		expect(resolveMilestoneLabel("7")).toBe("Bug Fix Week");
	});

	it("handles zero-padded m-N ids", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-01", "Alpha")]);
		expect(resolveMilestoneLabel("m-1")).toBe("Alpha");
		expect(resolveMilestoneLabel("1")).toBe("Alpha");
	});

	it("handles uppercase M in m-N ids", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("M-5", "Beta")]);
		expect(resolveMilestoneLabel("m-5")).toBe("Beta");
		expect(resolveMilestoneLabel("M-5")).toBe("Beta");
		expect(resolveMilestoneLabel("5")).toBe("Beta");
	});

	it("returns original string for unknown milestone", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-1", "Sprint 1")]);
		expect(resolveMilestoneLabel("Unknown")).toBe("Unknown");
	});

	it("returns original for empty string", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-1", "Sprint 1")]);
		expect(resolveMilestoneLabel("")).toBe("");
	});

	it("returns original for whitespace-only string", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-1", "Sprint 1")]);
		expect(resolveMilestoneLabel(" ")).toBe(" ");
	});

	it("trims whitespace from lookup key", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-1", "Sprint 1")]);
		expect(resolveMilestoneLabel("  Sprint 1  ")).toBe("Sprint 1");
	});

	it("handles empty milestones array", () => {
		const { availableMilestoneTitles } = buildTaskViewerMilestoneFilterModel([]);
		expect(availableMilestoneTitles).toEqual([]);
	});

	it("skips milestones with empty id in resolver map", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([
			milestone("", "Empty ID"),
			milestone("m-3", "Valid"),
		]);
		expect(resolveMilestoneLabel("Empty ID")).toBe("Empty ID");
	});

	it("skips milestones with empty title in resolver map", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([
			milestone("m-2", "  "),
			milestone("m-3", "Valid"),
		]);
		expect(resolveMilestoneLabel("m-2")).toBe("m-2");
	});

	it("resolves all aliases for a single milestone", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("m-100", "v3.0 Launch")]);
		expect(resolveMilestoneLabel("v3.0 Launch")).toBe("v3.0 Launch");
		expect(resolveMilestoneLabel("m-100")).toBe("v3.0 Launch");
		expect(resolveMilestoneLabel("100")).toBe("v3.0 Launch");
	});

	it("resolves multiple milestones independently", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([
			milestone("m-1", "Sprint 1"),
			milestone("m-2", "Sprint 2"),
		]);
		expect(resolveMilestoneLabel("Sprint 1")).toBe("Sprint 1");
		expect(resolveMilestoneLabel("Sprint 2")).toBe("Sprint 2");
		expect(resolveMilestoneLabel("m-1")).toBe("Sprint 1");
		expect(resolveMilestoneLabel("m-2")).toBe("Sprint 2");
		expect(resolveMilestoneLabel("1")).toBe("Sprint 1");
		expect(resolveMilestoneLabel("2")).toBe("Sprint 2");
	});

	it("does not create numeric alias for non-m-N ids", () => {
		const { resolveMilestoneLabel } = buildTaskViewerMilestoneFilterModel([milestone("v2-release", "Version 2")]);
		expect(resolveMilestoneLabel("v2-release")).toBe("Version 2");
		expect(resolveMilestoneLabel("Version 2")).toBe("Version 2");
	});

	it("includes all milestones in availableTitles", () => {
		const { availableMilestoneTitles } = buildTaskViewerMilestoneFilterModel([
			milestone("m-1", "  "),
			milestone("", "No ID"),
			milestone("m-3", "Sprint 3"),
			milestone("m-4", "Sprint 4"),
		]);
		expect(availableMilestoneTitles).toEqual(["  ", "No ID", "Sprint 3", "Sprint 4"]);
	});
});

// ---------------------------------------------------------------------------
// viewTaskEnhanced — non-TTY path
// ---------------------------------------------------------------------------
async function withIsTTY(value: boolean, fn: () => Promise<void>): Promise<void> {
	const orig = process.stdout.isTTY;
	Object.defineProperty(process.stdout, "isTTY", { value, configurable: true });
	try {
		await fn();
	} finally {
		Object.defineProperty(process.stdout, "isTTY", { value: orig, configurable: true });
	}
}

describe("viewTaskEnhanced non-TTY", () => {
	it("outputs task plain text when stdout is not a TTY", () =>
		withIsTTY(false, async () => {
			const { viewTaskEnhanced } = await import("../ui/task-viewer-with-search.ts");

			const lines: string[] = [];
			const origWrite = process.stdout.write.bind(process.stdout);
			process.stdout.write = ((chunk: string | Uint8Array) => {
				lines.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
				return Promise.resolve(typeof chunk === "string" ? chunk.length : chunk.byteLength);
			}) as unknown as typeof process.stdout.write;

			await viewTaskEnhanced({
				id: "TEST-1",
				title: "Test title",
				status: "In Progress",
				assignee: [],
				createdDate: "2024-06-01",
				labels: [],
				dependencies: [],
			});

			process.stdout.write = origWrite;
			expect(lines.length).toBeGreaterThan(0);
			expect(lines.some((l) => l.includes("TEST-1"))).toBe(true);
		}));
});

// ---------------------------------------------------------------------------
// viewTaskEnhanced — termless-based TUI tests
// ---------------------------------------------------------------------------
const canRunShell =
	process.platform !== "win32" && (process.env.RUN_INTERACTIVE_TUI_TESTS === "1" || process.env.CI === "true");

(canRunShell ? describe : describe.skip)("viewTaskEnhanced termless", () => {
	let testDir: string;

	async function withTaskViewer(fn: (t: ReturnType<typeof term>) => Promise<void>, args: string[] = []): Promise<void> {
		const t = term(120, 40);
		try {
			await t.spawn(["bun", join(process.cwd(), "src", "cli.ts"), "task", ...args], {
				cwd: testDir,
			});
			await t.waitFor("First Task", 10000);
			await fn(t);
		} finally {
			await t.close().catch(() => {});
		}
	}

	async function withTaskList(fn: (t: ReturnType<typeof term>) => Promise<void>): Promise<void> {
		const t = term(120, 40);
		try {
			await t.spawn(["bun", join(process.cwd(), "src", "cli.ts"), "task", "list"], {
				cwd: testDir,
			});
			await t.waitFor("First Task", 10000);
			await fn(t);
		} finally {
			await t.close().catch(() => {});
		}
	}

	beforeEach(async () => {
		testDir = createUniqueTestDir("task-viewer");
		mkdirSync(testDir, { recursive: true });
		await $`git init -b main`.cwd(testDir).quiet();
		await $`git config user.email test@example.com`.cwd(testDir).quiet();
		await $`git config user.name Test`.cwd(testDir).quiet();
		const core = new Core(testDir);
		await initializeTestProject(core, "Task Viewer Test");
		await core.createTask(
			{
				id: "task-1",
				title: "First Task",
				status: "To Do",
				priority: "medium",
				labels: [],
				assignee: [],
				dependencies: [],
				createdDate: "2024-01-01",
				description: "",
			},
			false,
		);
		await core.createTask(
			{
				id: "task-2",
				title: "Second Task",
				status: "In Progress",
				priority: "high",
				labels: [],
				assignee: [],
				dependencies: [],
				createdDate: "2024-01-01",
				description: "",
			},
			false,
		);
	});

	afterEach(async () => {
		try {
			await safeCleanup(testDir);
		} catch {}
	});

	it("launches task viewer with tasks", async () => {
		await withTaskViewer(
			async (t) => {
				expect(t.screen.getText()).toContain("First Task");
				t.press("q");
			},
			["task-1"],
		);
	});

	it("navigates task list", async () => {
		await withTaskList(async (t) => {
			expect(t.screen.getText()).toContain("First Task");
			expect(t.screen.getText()).toContain("Second Task");
			t.press("down");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("activates search via / key", async () => {
		await withTaskList(async (t) => {
			t.press("/");
			await new Promise((r) => setTimeout(r, 30));
			t.press("Escape");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});
});
