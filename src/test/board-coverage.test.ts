import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Task } from "../types/index.ts";

// ============================================================================
// Mock State — shared between mock factory and tests
// ============================================================================

const _screenKeyHandlers: Array<{
	keys: string[];
	handler: (...args: unknown[]) => void;
}> = [];

const _allKeyHandlers: Array<{
	keys: string[];
	handler: (...args: unknown[]) => void;
}> = [];

function resetMockState(): void {
	_screenKeyHandlers.length = 0;
	_allKeyHandlers.length = 0;
}

function createMockWidget() {
	const kh: Array<{
		keys: string[];
		handler: (...args: unknown[]) => void;
	}> = [];
	const eh: Record<string, Array<(...args: unknown[]) => void>> = {};
	return {
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 80,
		height: 24,
		style: {
			border: { fg: "gray" },
			selected: { bg: undefined as string | undefined },
			bg: "black",
			fg: "white",
			focus: { fg: "black", bg: "cyan" },
		},
		destroy: () => {},
		key: (keys: string[], handler: (...args: unknown[]) => void) => {
			kh.push({ keys, handler });
			_allKeyHandlers.push({ keys, handler });
		},
		on: (event: string, handler: (...args: unknown[]) => void) => {
			if (!eh[event]) eh[event] = [];
			eh[event].push(handler);
		},
		focus: () => {},
		setFront: () => {},
		setContent: (_content: string) => {},
		setScroll: () => {},
		scroll: () => {},
		setScrollPerc: () => {},
		getScroll: (): number => 0,
		setLabel: () => {},
		remove: () => {},
		setItems: (_items: string[]) => {},
		select: (_index: number) => {},
		selected: 0,
		setValue: (_v: string) => {},
		getValue: (): string => "",
		getCursor: (): { x: number; y: number } => ({ x: 0, y: 0 }),
		strWidth: (_s: string): number => 0,
		readInput: () => {},
		cancel: () => {},
		_handlers: { key: kh, event: eh },
	};
}

// Intercept neo-neo-bblessed BEFORE any dynamic import of board.ts.
// Because every UI component file imports from this package, a single
// mock covers the entire import chain (tui, filter-header, confirm-popup,
// task-viewer-with-search, etc.).
mock.module("neo-neo-bblessed", () => ({
	box: () => createMockWidget(),
	line: () => createMockWidget(),
	list: () => createMockWidget(),
	log: () => {},
	textbox: () => createMockWidget(),
	text: () => createMockWidget(),
	scrollablebox: () => createMockWidget(),
	scrollabletext: () => createMockWidget(),
	screen: () => {
		const s = createMockWidget();
		(s as Record<string, unknown>).width = 120;
		(s as Record<string, unknown>).height = 40;
		(s as Record<string, unknown>).render = () => {};
		(s as Record<string, unknown>).key = (keys: string[], handler: (...args: unknown[]) => void) => {
			_screenKeyHandlers.push({ keys, handler });
			_allKeyHandlers.push({ keys, handler });
		};
		return s;
	},
	program: () => ({}),
}));

// Mock sub-component modules so async popups resolve immediately
mock.module("../ui/components/filter-popup.ts", () => ({
	openSingleSelectFilterPopup: async () => null,
	openMultiSelectFilterPopup: async () => null,
	createPopupChrome: () => ({ popup: createMockWidget(), close: () => {} }),
}));

mock.module("../ui/components/help-popup.ts", () => ({
	openHelpPopup: async () => {},
	getHelpShortcuts: () => [],
}));

mock.module("../ui/components/confirm-popup.ts", () => ({
	openConfirmPopup: async () => true,
}));

// Mock clipboard to avoid native dependency
mock.module("../utils/clipboard.ts", () => ({
	copyToClipboard: async () => true,
}));

// ============================================================================
// Factory helpers
// ============================================================================

function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "TASK-1",
		title: "Test task",
		status: "To Do",
		assignee: [],
		createdDate: "2024-01-01",
		labels: [],
		dependencies: [],
		...overrides,
	};
}

// ============================================================================
// formatTaskListItem
// ============================================================================

describe("formatTaskListItem", () => {
	it("formats task with id and title", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ id: "T-1", title: "Hello" }));
		expect(result).toContain("{bold}T-1{/bold}");
		expect(result).toContain("Hello");
	});

	it("formats task with @-prefixed assignee", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ assignee: ["@jo"] }));
		expect(result).toContain("{cyan-fg}@jo{/}");
	});

	it("prepends @ to assignee without prefix", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ assignee: ["jo"] }));
		expect(result).toContain("{cyan-fg}@jo{/}");
	});

	it("omits assignee when empty", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ assignee: [] }));
		expect(result).not.toContain("{cyan-fg}");
	});

	it("formats task with labels", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ labels: ["bug"] }));
		expect(result).toContain("{yellow-fg}[bug]{/}");
	});

	it("omits labels when empty", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ labels: [] }));
		expect(result).not.toContain("{yellow-fg}");
	});

	it("formats task with branch", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ branch: "feat/x" }));
		expect(result).toContain("{green-fg}(feat/x){/}");
	});

	it("omits branch when not present", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask());
		expect(result).not.toContain("{green-fg}");
	});

	it("marks moving task with magenta arrow", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask(), true);
		expect(result).toContain("{magenta-fg}►");
	});

	it("does not mark non-moving task with arrow", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask(), false);
		expect(result).not.toContain("►");
	});

	it("dims cross-branch task", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask({ branch: "other" }));
		expect(result).toContain("{gray-fg}");
	});

	it("does not dim non-branch task", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(makeTask());
		expect(result).not.toContain("{gray-fg}");
	});

	it("combines all formatting elements", async () => {
		const { formatTaskListItem } = await import("../ui/board.ts");
		const result = formatTaskListItem(
			makeTask({
				id: "T-99",
				title: "Complex",
				assignee: ["dev"],
				labels: ["urgent"],
				branch: "fix/99",
			}),
		);
		expect(result).toContain("{bold}T-99{/bold}");
		expect(result).toContain("@dev");
		expect(result).toContain("[urgent]");
		expect(result).toContain("(fix/99)");
	});
});

// ============================================================================
// shouldRebuildColumns
// ============================================================================

describe("shouldRebuildColumns", () => {
	it("returns false for identical columns", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const cols = [{ status: "To Do", tasks: [makeTask()] }];
		expect(shouldRebuildColumns(cols, cols)).toBe(false);
	});

	it("returns true when lengths differ", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a = [{ status: "To Do", tasks: [] }];
		const b = [
			{ status: "To Do", tasks: [] },
			{ status: "Done", tasks: [] },
		];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});

	it("returns true when status differs", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a = [{ status: "To Do", tasks: [] }];
		const b = [{ status: "Done", tasks: [] }];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});

	it("returns true when task count differs", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a = [{ status: "To Do", tasks: [makeTask()] }];
		const b = [{ status: "To Do", tasks: [] }];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});

	it("returns true when task IDs differ", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a = [{ status: "To Do", tasks: [makeTask({ id: "T-1" })] }];
		const b = [{ status: "To Do", tasks: [makeTask({ id: "T-2" })] }];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});

	it("returns true when current is empty and next has items", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a: { status: string; tasks: Task[] }[] = [];
		const b = [{ status: "To Do", tasks: [makeTask()] }];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});

	it("returns true when next column entry is falsy", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a = [{ status: "To Do", tasks: [makeTask()] }];
		const b = [
			undefined as unknown as {
				status: string;
				tasks: Task[];
			},
		];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});

	it("returns true when current column entry is falsy", async () => {
		const { shouldRebuildColumns } = await import("../ui/board.ts");
		const a = [
			undefined as unknown as {
				status: string;
				tasks: Task[];
			},
		];
		const b = [{ status: "To Do", tasks: [makeTask()] }];
		expect(shouldRebuildColumns(a, b)).toBe(true);
	});
});

// ============================================================================
// renderBoardTui — non-TTY paths
// ============================================================================

describe("renderBoardTui non-TTY", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	it("logs kanban board when stdout is not a TTY", async () => {
		process.stdout.isTTY = false;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [makeTask({ id: "T-1", title: "My task", status: "To Do" })];
		const lines: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => lines.push(args.join(" "));

		await renderBoardTui(tasks, ["To Do"], "horizontal", 30);

		console.log = origLog;
		expect(lines.length).toBeGreaterThan(0);
	});

	it("logs milestone board when milestone mode and not TTY", async () => {
		process.stdout.isTTY = false;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({
				id: "T-1",
				title: "Task",
				milestone: "m-1",
			}),
		];
		const lines: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => lines.push(args.join(" "));

		await renderBoardTui(tasks, ["To Do"], "horizontal", 30, {
			milestoneMode: true,
			milestoneEntities: [
				{
					id: "m-1",
					title: "Sprint 1",
					description: "",
					rawContent: "",
				},
			],
		});

		console.log = origLog;
		expect(lines.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// renderBoardTui — TTY path
// ============================================================================

describe("renderBoardTui TTY path", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	beforeEach(() => {
		resetMockState();
	});

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	afterEach(() => {
		process.stdout.isTTY = true;
	});

	it("exits via q key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({
				id: "T-1",
				title: "First",
				status: "To Do",
			}),
			makeTask({
				id: "T-2",
				title: "Second",
				status: "In Progress",
			}),
		];

		const promise = renderBoardTui(tasks, ["To Do", "In Progress"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		expect(qHandler).toBeDefined();
		qHandler?.handler();
		await promise;
	});

	it("handles parent-child task grouping", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({
				id: "P-1",
				title: "Parent",
				status: "To Do",
			}),
			makeTask({
				id: "C-1",
				title: "Child",
				status: "To Do",
				parentTaskId: "P-1",
			}),
		];

		const promise = renderBoardTui(tasks, ["To Do"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles done column with reverse sort", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({
				id: "T-2",
				title: "Second",
				status: "Done",
			}),
			makeTask({
				id: "T-1",
				title: "First",
				status: "Done",
			}),
		];

		const promise = renderBoardTui(tasks, ["Done"], "horizontal", 30, { terminalStatuses: ["Done"] });
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles ordinal-based sorting", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({
				id: "T-2",
				title: "Second",
				status: "To Do",
				ordinal: 2,
			}),
			makeTask({
				id: "T-1",
				title: "First",
				status: "To Do",
				ordinal: 1,
			}),
		];

		const promise = renderBoardTui(tasks, ["To Do"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles tasks with labels and branch for column rendering", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({
				id: "T-1",
				title: "Main",
				status: "To Do",
				assignee: ["dev"],
				labels: ["feature"],
				branch: "feat/123",
			}),
		];

		const promise = renderBoardTui(tasks, ["To Do"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("logs no tasks when initial columns are empty", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const lines: string[] = [];
		const origLog = console.log;
		console.log = (...args: unknown[]) => lines.push(args.join(" "));

		await renderBoardTui([], [], "horizontal", 30);

		console.log = origLog;
		expect(lines).toContain("No tasks available for the Kanban board.");
	});

	// ======================================================================
	// Keyboard navigation
	// ======================================================================

	it("navigates left between columns", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({ id: "T-1", title: "Left col", status: "To Do" }),
			makeTask({ id: "T-2", title: "Right col", status: "In Progress" }),
		];

		const promise = renderBoardTui(tasks, ["To Do", "In Progress"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		// Move right to second column, then left back to first
		const rightHandler = _screenKeyHandlers.find((h) => h.keys.includes("right"));
		expect(rightHandler).toBeDefined();
		rightHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const leftHandler = _screenKeyHandlers.find((h) => h.keys.includes("left"));
		expect(leftHandler).toBeDefined();
		leftHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("navigates right between columns", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({ id: "T-1", title: "Left col", status: "To Do" }),
			makeTask({ id: "T-2", title: "Right col", status: "In Progress" }),
		];

		const promise = renderBoardTui(tasks, ["To Do", "In Progress"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const rightHandler = _screenKeyHandlers.find((h) => h.keys.includes("right"));
		expect(rightHandler).toBeDefined();
		rightHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("navigates up and down within a column", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const tasks = [
			makeTask({ id: "T-1", title: "First", status: "To Do" }),
			makeTask({ id: "T-2", title: "Second", status: "To Do" }),
		];

		const promise = renderBoardTui(tasks, ["To Do"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const downHandler = _screenKeyHandlers.find((h) => h.keys.includes("down"));
		expect(downHandler).toBeDefined();
		downHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const upHandler = _screenKeyHandlers.find((h) => h.keys.includes("up"));
		expect(upHandler).toBeDefined();
		upHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles navigation with no tasks in column (boundary)", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui([makeTask({ id: "T-1", title: "Only", status: "To Do" })], ["To Do"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		const downHandler = _screenKeyHandlers.find((h) => h.keys.includes("down"));
		downHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Search mode
	// ======================================================================

	it("activates search via / key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const slashHandler = _screenKeyHandlers.find((h) => h.keys.includes("/"));
		expect(slashHandler).toBeDefined();
		slashHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("activates search via C-f key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const cfHandler = _screenKeyHandlers.find((h) => h.keys.includes("C-f"));
		expect(cfHandler).toBeDefined();
		cfHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Filter keys
	// ======================================================================

	it("opens priority filter via p key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const pHandler = _screenKeyHandlers.find((h) => h.keys.includes("p"));
		expect(pHandler).toBeDefined();
		pHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("opens milestone filter via i key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do", milestone: "m-1" })],
			["To Do"],
			"horizontal",
			30,
			{
				milestoneEntities: [{ id: "m-1", title: "Sprint 1", description: "", rawContent: "" }],
			},
		);
		await new Promise((r) => setTimeout(r, 10));

		const iHandler = _screenKeyHandlers.find((h) => h.keys.includes("i"));
		expect(iHandler).toBeDefined();
		iHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("opens label filter via f key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do", labels: ["bug"] })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const fHandler = _screenKeyHandlers.find((h) => h.keys.includes("f"));
		expect(fHandler).toBeDefined();
		fHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Move mode
	// ======================================================================

	it("enters and cancels move mode via m then escape", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Movable", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const mHandler = _screenKeyHandlers.find((h) => h.keys.includes("m"));
		expect(mHandler).toBeDefined();
		await mHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		// Cancel via escape
		const escHandler = _screenKeyHandlers.find((h) => h.keys.length === 1 && h.keys[0] === "escape");
		expect(escHandler).toBeDefined();
		escHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("prevents move when branch task is selected", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Branched", status: "To Do", branch: "feature/x" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const mHandler = _screenKeyHandlers.find((h) => h.keys.includes("m"));
		expect(mHandler).toBeDefined();
		await mHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("prevents move when filters are active", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
			{
				filters: { searchQuery: "test", priorityFilter: "", labelFilter: [], milestoneFilter: "" },
			},
		);
		await new Promise((r) => setTimeout(r, 10));

		const mHandler = _screenKeyHandlers.find((h) => h.keys.includes("m"));
		expect(mHandler).toBeDefined();
		await mHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Tab key
	// ======================================================================

	it("handles tab key without view switcher", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const taskSelected: string[] = [];
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
			{
				onTaskSelect: (task) => taskSelected.push(task.id),
			},
		);
		await new Promise((r) => setTimeout(r, 10));

		const tabHandler = _screenKeyHandlers.find((h) => h.keys.includes("tab"));
		expect(tabHandler).toBeDefined();
		tabHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Yank key
	// ======================================================================

	it("yanks task id via y key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const yHandler = _screenKeyHandlers.find((h) => h.keys.includes("y") && !h.keys.includes("S-e"));
		expect(yHandler).toBeDefined();
		// The y handler is registered twice (global + screen), call the screen one
		const screenYHandler = _screenKeyHandlers.find((h) => h.keys.includes("y"));
		screenYHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Escape key
	// ======================================================================

	it("handles escape when not in filter or modal", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		// escape should trigger screen destroy and resolve when not in popup/modal
		const escHandler = _screenKeyHandlers.find((h) => h.keys.length === 1 && h.keys[0] === "escape");
		expect(escHandler).toBeDefined();
		escHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Help key
	// ======================================================================

	it("opens help popup via ? key", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("?"));
		expect(qHandler).toBeDefined();
		qHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const quitHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		quitHandler?.handler();
		await promise;
	});

	// ======================================================================
	// Complete / Archive keys
	// ======================================================================

	it("handles complete key c", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const cHandler = _screenKeyHandlers.find((h) => h.keys.includes("c"));
		expect(cHandler).toBeDefined();
		cHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles archive key a", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const aHandler = _screenKeyHandlers.find((h) => h.keys.includes("a"));
		expect(aHandler).toBeDefined();
		aHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles complete on branch task (error path)", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Branch task", status: "To Do", branch: "feature/x" })],
			["To Do"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		const cHandler = _screenKeyHandlers.find((h) => h.keys.includes("c"));
		cHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});
});

// ============================================================================
// renderBoardTui — Edge cases
// ============================================================================

describe("renderBoardTui edge cases", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	beforeEach(() => {
		resetMockState();
	});

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	it("handles onFilterChange callback", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const filterChanges: Array<Record<string, unknown>> = [];
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
			{
				onFilterChange: (filters) => filterChanges.push({ ...filters }),
			},
		);
		await new Promise((r) => setTimeout(r, 10));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles move mode with left/right column switching", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[
				makeTask({ id: "T-1", title: "First", status: "To Do" }),
				makeTask({ id: "T-2", title: "Second", status: "In Progress" }),
			],
			["To Do", "In Progress"],
			"horizontal",
			30,
		);
		await new Promise((r) => setTimeout(r, 10));

		// Enter move mode
		const mHandler = _screenKeyHandlers.find((h) => h.keys.includes("m"));
		await mHandler?.handler();
		await new Promise((r) => setTimeout(r, 10));

		// Switch column in move mode via right then left
		const rightHandler = _screenKeyHandlers.find((h) => h.keys.includes("right"));
		rightHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));
		rightHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const leftHandler = _screenKeyHandlers.find((h) => h.keys.includes("left"));
		leftHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		// Cancel
		const escHandler = _screenKeyHandlers.find((h) => h.keys.length === 1 && h.keys[0] === "escape");
		escHandler?.handler();
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles subscribeUpdates callback", async () => {
		process.stdout.isTTY = true;
		let registeredUpdater: ((tasks: Task[], statuses: string[]) => void) | undefined;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui(
			[makeTask({ id: "T-1", title: "Task", status: "To Do" })],
			["To Do"],
			"horizontal",
			30,
			{
				subscribeUpdates: (update) => {
					registeredUpdater = update;
				},
			},
		);
		await new Promise((r) => setTimeout(r, 10));

		// Trigger an update
		if (registeredUpdater) {
			registeredUpdater([], []);
		}
		await new Promise((r) => setTimeout(r, 5));

		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});

	it("handles empty columns data with restoreSelection", async () => {
		process.stdout.isTTY = true;
		const { renderBoardTui } = await import("../ui/board.ts");
		const promise = renderBoardTui([], ["To Do"], "horizontal", 30);
		await new Promise((r) => setTimeout(r, 10));

		// Nothing to navigate, just verify it exits
		const qHandler = _screenKeyHandlers.find((h) => h.keys.includes("q"));
		qHandler?.handler();
		await promise;
	});
});
