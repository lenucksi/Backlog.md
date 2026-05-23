import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Milestone, Task } from "../types/index.ts";

// Global key handler tracker for viewTaskEnhanced tests
const _screenKeyHandlers: Array<{
	keys: string[];
	handler: (...args: unknown[]) => void;
}> = [];

function resetGlobalHandlers(): void {
	_screenKeyHandlers.length = 0;
}

import {
	buildTaskViewerMilestoneFilterModel,
	resolveFilterExitPane,
	resolveSearchExitTargetIndex,
	resolveTaskListSelection,
	shouldMoveFromDetailBoundaryToSearch,
	shouldMoveFromListBoundaryToSearch,
} from "../ui/task-viewer-with-search.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function milestone(id: string, title: string): Milestone {
	return { id, title, description: "", rawContent: "" };
}

const _emptyTask: Task = {
	id: "TASK-1",
	title: "Test task",
	status: "To Do",
	assignee: [],
	createdDate: "2024-01-01",
	labels: [],
	dependencies: [],
};

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
// createTaskPopup  (requires mocked neo-neo-bblessed)
// ---------------------------------------------------------------------------
function createMockWidget() {
	const keyHandlers: Array<{ keys: string[]; handler: () => void }> = [];
	const eventHandlers: Record<string, Array<() => void>> = {};

	const widget = {
		top: 0,
		left: 0,
		width: 80,
		height: 24,
		bottom: 0,
		right: 0,
		style: { border: { fg: "gray" }, selected: { bg: undefined as string | undefined }, bg: "black", fg: "white" },
		destroy: () => {},
		key: (keys: string[], handler: () => void) => {
			keyHandlers.push({ keys, handler });
			return false;
		},
		on: (event: string, handler: () => void) => {
			if (!eventHandlers[event]) eventHandlers[event] = [];
			eventHandlers[event].push(handler);
			return widget;
		},
		focus: () => {
			if (eventHandlers.focus) {
				for (const h of eventHandlers.focus) h();
			}
		},
		setFront: () => {},
		setContent: () => {},
		setScroll: () => {},
		scroll: () => {},
		setScrollPerc: () => {},
		getScroll: () => 0,
		getCursor: (): { x: number; y: number } => ({ x: 0, y: 0 }),
		strWidth: (_s: string): number => _s.length,
		readInput: () => {},
		cancel: () => {},
		setValue: (_v: string) => {},
		getValue: (): string => "",
		setItems: (_items: string[]) => {},
		select: (_index: number) => {},
		selected: 0,
		setLabel: () => {},
		remove: () => {},
		_handlers: { key: keyHandlers, event: eventHandlers },
	};
	return widget;
}

// Screen event tracking for viewTaskEnhanced tests
function createScreenMock() {
	const eventCallbacks: Record<string, Array<() => void>> = {};
	return {
		...createMockWidget(),
		width: 120,
		height: 40,
		render: () => {},
		key: (keys: string[], handler: (...args: unknown[]) => void) => {
			_screenKeyHandlers.push({ keys, handler });
		},
		on: (event: string, cb: () => void) => {
			if (!eventCallbacks[event]) eventCallbacks[event] = [];
			eventCallbacks[event].push(cb);
		},
		destroy: () => {
			for (const cb of eventCallbacks.destroy || []) cb();
		},
		title: "",
	};
}

mock.module("neo-neo-bblessed", () => ({
	box: () => createMockWidget(),
	line: () => createMockWidget(),
	list: () => createMockWidget(),
	text: () => createMockWidget(),
	textbox: () => createMockWidget(),
	scrollablebox: () => createMockWidget(),
	scrollabletext: () => createMockWidget(),
	log: () => {},
	screen: () => createScreenMock(),
	program: () => ({}),
}));

// Mock core for viewTaskEnhanced TTY path
mock.module("../core/backlog.ts", () => ({
	Core: class MockCore {
		filesystem = {
			loadConfig: async () => ({ statuses: ["To Do", "In Progress", "Done"], labels: [] }),
			listMilestones: async () => [],
		};
		getContentStore = async () => null;
		getSearchService = async () => null;
		queryTasks = async () => [];
		getTaskWithSubtasks = async () => null;
		editTaskInTui = async () => ({ reason: "not_found", task: null, changed: false });
		completeTask = async () => false;
		archiveTask = async () => false;
		reorderTask = async () => ({ updatedTask: null, changedTasks: [] });
	},
}));

function makeRichTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "TASK-42",
		title: "Implement feature X",
		status: "In Progress",
		assignee: ["jo"],
		reporter: "bot",
		createdDate: "2024-01-15",
		updatedDate: "2024-02-20",
		labels: ["feature", "backend"],
		milestone: "m-1",
		dependencies: ["TASK-1"],
		references: ["https://example.com", "docs/guide.md"],
		documentation: ["https://docs.example.com", "README.md"],
		modifiedFiles: ["src/file1.ts", "src/file2.ts"],
		description: "This is a *description* with `code`.",
		implementationPlan: "1. Plan step\n2. Plan step two",
		implementationNotes: "Remember to test edge cases",
		finalSummary: "All features implemented and tested",
		acceptanceCriteriaItems: [
			{ index: 1, text: "AC-1 works", checked: true },
			{ index: 2, text: "AC-2 works", checked: false },
		],
		definitionOfDoneItems: [{ index: 1, text: "DoD-1 complete", checked: true }],
		priority: "high",
		branch: "feature/back-42",
		parentTaskId: "TASK-10",
		parentTaskTitle: "Parent epic",
		subtasks: ["TASK-43", "TASK-44"],
		...overrides,
	};
}

describe("createTaskPopup", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	it("returns popup object with expected shape", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask();
		const resolveLabel = (m: string) => (m === "m-1" ? "Milestone One" : m);

		const result = await popupFactory(screen, task, resolveLabel);

		expect(result).not.toBeNull();
		expect(result?.background).toBeDefined();
		expect(result?.popup).toBeDefined();
		expect(result?.contentArea).toBeDefined();
		expect(typeof result?.close).toBe("function");
	});

	it("handles a minimal task with no optional fields", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task: Task = {
			id: "TASK-1",
			title: "Minimal",
			status: "To Do",
			assignee: [],
			createdDate: "2024-06-01",
			labels: [],
			dependencies: [],
		};

		const result = await popupFactory(screen, task);
		expect(result).not.toBeNull();
	});

	it("handles a completed task", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask({ status: "Done" });
		const result = await popupFactory(screen, task);
		expect(result).not.toBeNull();
		expect(typeof result?.close).toBe("function");
	});

	it("close function can be called without errors", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask();
		const result = await popupFactory(screen, task);
		expect(result).not.toBeNull();
		expect(() => result?.close()).not.toThrow();
	});

	it("handles medium priority task", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask({ priority: "medium" });
		const result = await popupFactory(screen, task);
		expect(result).not.toBeNull();
	});

	it("handles low priority task", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask({ priority: "low" });
		const result = await popupFactory(screen, task);
		expect(result).not.toBeNull();
	});

	it("handles task with updatedDate same as createdDate to verify skip", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask({ updatedDate: "2024-01-15" });
		const result = await popupFactory(screen, task);
		expect(result).not.toBeNull();
	});

	it("popup escape key handler runs without error", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const result = await popupFactory(screen, makeRichTask());
		expect(result).not.toBeNull();
		const popup = result?.popup as unknown as {
			_handlers: { key: Array<{ keys: string[]; handler: () => void }> };
		};
		expect(popup._handlers.key.length).toBeGreaterThanOrEqual(1);

		const escapePopupHandler = popup._handlers.key.find((h) => h.keys.includes("escape"));
		expect(escapePopupHandler).toBeDefined();
		expect(() => escapePopupHandler?.handler()).not.toThrow();
	});

	it("contentArea focus event handler runs without error", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const result = await popupFactory(screen, makeRichTask());
		expect(result).not.toBeNull();
		const contentArea = result?.contentArea as unknown as {
			_handlers: { event: Record<string, Array<() => void>> };
		};
		const focusHandlers = contentArea._handlers.event.focus;
		expect(focusHandlers).toBeDefined();
		expect(() => {
			for (const h of focusHandlers) h();
		}).not.toThrow();
	});

	it("contentArea blur event handler runs without error", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const result = await popupFactory(screen, makeRichTask());
		expect(result).not.toBeNull();
		const contentArea = result?.contentArea as unknown as {
			_handlers: { event: Record<string, Array<() => void>> };
		};
		const blurHandlers = contentArea._handlers.event.blur;
		expect(blurHandlers).toBeDefined();
		expect(() => {
			for (const h of blurHandlers) h();
		}).not.toThrow();
	});

	it("contentArea escape key handler runs without error", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const result = await popupFactory(screen, makeRichTask());
		expect(result).not.toBeNull();
		const contentArea = result?.contentArea as unknown as {
			_handlers: { key: Array<{ keys: string[]; handler: () => void }> };
		};
		const escapeHandler = contentArea._handlers.key.find((h) => h.keys.includes("escape"));
		expect(escapeHandler).toBeDefined();
		expect(() => escapeHandler?.handler()).not.toThrow();
	});

	it("handles invalid priority value hitting default switch case in getPriorityDisplay", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const task = makeRichTask({ priority: "invalid" as unknown as undefined });
		const result = await popupFactory(screen as any, task);
		expect(result).not.toBeNull();
	});

	// ====================================================================
	// Additional createTaskPopup edge cases
	// ====================================================================

	it("handles task with empty description", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ description: "" }));
		expect(result).not.toBeNull();
	});

	it("handles task with no priority", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ priority: undefined }));
		expect(result).not.toBeNull();
	});

	it("handles task with no references or documentation", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ references: [], documentation: [] }));
		expect(result).not.toBeNull();
	});

	it("handles task with no acceptance criteria or dod", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ acceptanceCriteriaItems: [], definitionOfDoneItems: [] }));
		expect(result).not.toBeNull();
	});

	it("handles task with no plan, notes, or summary", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(
			screen,
			makeRichTask({ implementationPlan: "", implementationNotes: "", finalSummary: "" }),
		);
		expect(result).not.toBeNull();
	});

	it("handles task with only parentTaskId but no parentTaskTitle", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ parentTaskTitle: undefined, parentTaskId: "TASK-99" }));
		expect(result).not.toBeNull();
	});

	it("handles task with single subtask (singular label)", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ subtasks: ["TASK-1"] }));
		expect(result).not.toBeNull();
	});

	it("handles task with reporter that has @ prefix", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ reporter: "@bot" }));
		expect(result).not.toBeNull();
	});

	it("handles task with only file-path references", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ references: ["docs/guide.md", "README.md"] }));
		expect(result).not.toBeNull();
	});

	it("handles task with only URL documentation", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ documentation: ["https://docs.example.com"] }));
		expect(result).not.toBeNull();
	});

	it("handles task with no milestone", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ milestone: undefined }));
		expect(result).not.toBeNull();
	});

	it("handles task with no modifiedFiles", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ modifiedFiles: [] }));
		expect(result).not.toBeNull();
	});

	it("returns null when stdout is not a TTY", async () => {
		process.stdout.isTTY = false;
		try {
			const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
			const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
			const result = await popupFactory(screen, makeRichTask());
			expect(result).toBeNull();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("handles task with no dependencies", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ dependencies: [] }));
		expect(result).not.toBeNull();
	});

	it("handles task with no labels", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ labels: [] }));
		expect(result).not.toBeNull();
	});

	it("handles task with no assignee", async () => {
		const { createTaskPopup: popupFactory } = await import("../ui/task-viewer-with-search.ts");
		const screen = { width: 120, height: 40, render: () => {}, key: () => {}, on: () => {}, destroy: () => {} };
		const result = await popupFactory(screen, makeRichTask({ assignee: [] }));
		expect(result).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// viewTaskEnhanced — non-TTY path
// ---------------------------------------------------------------------------
describe("viewTaskEnhanced non-TTY", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	it("outputs task plain text when stdout is not a TTY", async () => {
		process.stdout.isTTY = false;
		const { viewTaskEnhanced } = await import("../ui/task-viewer-with-search.ts");

		const lines: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => lines.push(args.join(" "));

		await viewTaskEnhanced({
			id: "TEST-1",
			title: "Test title",
			status: "In Progress",
			assignee: [],
			createdDate: "2024-06-01",
			labels: [],
			dependencies: [],
		});

		console.log = origLog;
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.some((l) => l.includes("TEST-1"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// viewTaskEnhanced — TTY path (with mocked widgets and core)
// ---------------------------------------------------------------------------
describe("viewTaskEnhanced TTY path", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;
	const origExit = process.exit;
	const origLog = console.log;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
		process.exit = origExit;
		console.log = origLog;
	});

	beforeEach(() => {
		resetGlobalHandlers();
	});

	it("loads with mocked core and exits via q handler", async () => {
		process.stdout.isTTY = true;
		console.log = () => {};
		process.exit = (() => {}) as typeof process.exit;

		const { viewTaskEnhanced } = await import("../ui/task-viewer-with-search.ts");

		const promise = viewTaskEnhanced(
			{
				id: "T-1",
				title: "Test",
				status: "To Do",
				assignee: [],
				createdDate: "2024-06-01",
				labels: [],
				dependencies: [],
			},
			{
				core: {
					filesystem: {
						loadConfig: async () => ({ statuses: ["To Do"], labels: [] }),
						listMilestones: async () => [],
					},
					getContentStore: async () => null,
					getSearchService: async () => null,
					queryTasks: async () => [],
					getTaskWithSubtasks: async () => null,
					editTaskInTui: async () => ({ reason: "not_found", task: null, changed: false }),
				},
				tasks: [
					{
						id: "T-1",
						title: "Test",
						status: "To Do",
						assignee: [],
						createdDate: "2024-06-01",
						labels: [],
						dependencies: [],
					},
				],
			},
		);

		await new Promise((r) => setTimeout(r, 50));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		expect(qHandler).toBeDefined();
		qHandler?.handler();
		await promise;
	});

	it("renders with searchQuery and statusFilter options", async () => {
		process.stdout.isTTY = true;
		console.log = () => {};
		process.exit = (() => {}) as typeof process.exit;

		const { viewTaskEnhanced } = await import("../ui/task-viewer-with-search.ts");

		const promise = viewTaskEnhanced(
			{
				id: "T-1",
				title: "Test",
				status: "To Do",
				assignee: [],
				createdDate: "2024-06-01",
				labels: [],
				dependencies: [],
			},
			{
				core: {
					filesystem: {
						loadConfig: async () => ({ statuses: ["To Do", "In Progress", "Done"], labels: ["bug"] }),
						listMilestones: async () => [milestone("m-1", "Sprint 1")],
					},
					getContentStore: async () => null,
					getSearchService: async () => null,
					queryTasks: async () => [],
					getTaskWithSubtasks: async () => null,
					editTaskInTui: async () => ({ reason: "not_found", task: null, changed: false }),
				},
				tasks: [
					{
						id: "T-1",
						title: "Test",
						status: "To Do",
						assignee: [],
						createdDate: "2024-06-01",
						labels: [],
						dependencies: [],
					},
				],
				searchQuery: "test",
				statusFilter: "To Do",
			},
		);

		await new Promise((r) => setTimeout(r, 50));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		expect(qHandler).toBeDefined();
		qHandler?.handler();
		await promise;
	});

	it("registers all expected screen key handlers", async () => {
		process.stdout.isTTY = true;
		console.log = () => {};
		process.exit = (() => {}) as typeof process.exit;

		const { viewTaskEnhanced } = await import("../ui/task-viewer-with-search.ts");

		const promise = viewTaskEnhanced(
			{
				id: "T-1",
				title: "Test",
				status: "To Do",
				assignee: [],
				createdDate: "2024-06-01",
				labels: [],
				dependencies: [],
			},
			{
				core: {
					filesystem: {
						loadConfig: async () => ({ statuses: ["To Do", "In Progress", "Done"], labels: [] }),
						listMilestones: async () => [],
					},
					getContentStore: async () => null,
					getSearchService: async () => null,
					queryTasks: async () => [],
					getTaskWithSubtasks: async () => null,
					editTaskInTui: async () => ({ reason: "not_found", task: null, changed: false }),
				},
				tasks: [
					{
						id: "T-1",
						title: "First",
						status: "To Do",
						assignee: [],
						createdDate: "2024-06-01",
						labels: [],
						dependencies: [],
					},
					{
						id: "T-2",
						title: "Second",
						status: "In Progress",
						assignee: [],
						createdDate: "2024-06-01",
						labels: [],
						dependencies: [],
					},
				],
			},
		);

		await new Promise((r) => setTimeout(r, 50));

		const expectedKeys = ["/", "C-f", "s", "p", "l", "i", "e", "y", "c", "a", "?", "escape", "q"];
		for (const key of expectedKeys) {
			const handler = _screenKeyHandlers.find((h) => h.keys.includes(key));
			expect(handler, `Missing handler for "${key}"`).toBeDefined();
		}

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});
});
