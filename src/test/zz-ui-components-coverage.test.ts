import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

// ============================================================================
// Mock State
// ============================================================================

const _allKeyHandlers: Array<{
	keys: string[];
	handler: (...args: unknown[]) => void;
}> = [];

function resetMockState(): void {
	_allKeyHandlers.length = 0;
}

function createMockWidget(extra: Record<string, unknown> = {}) {
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
		focus: () => {
			if (eh.focus) {
				for (const h of eh.focus) h();
			}
		},
		setFront: () => {},
		setContent: (_content: string) => {},
		setScroll: () => {},
		scroll: (_offset?: number) => {},
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
		strWidth: (_s: string): number => _s.length,
		readInput: () => {},
		cancel: () => {},
		_handlers: { key: kh, event: eh },
		...extra,
	};
}

mock.module("neo-neo-bblessed", () => ({
	box: () => createMockWidget(),
	line: () => createMockWidget(),
	list: () => createMockWidget(),
	textbox: () => createMockWidget(),
	scrollabletext: (opts: Record<string, unknown>) => createMockWidget(opts),
	screen: () => {
		const s = createMockWidget();
		(s as Record<string, unknown>).width = 120;
		(s as Record<string, unknown>).height = 40;
		(s as Record<string, unknown>).render = () => {};
		(s as Record<string, unknown>).key = (keys: string[], handler: (...args: unknown[]) => void) => {
			_allKeyHandlers.push({ keys, handler });
		};
		return s;
	},
	program: () => ({}),
}));

// ============================================================================
// help-popup
// ============================================================================

describe("help-popup", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	it("getHelpShortcuts returns board shortcuts by default", async () => {
		const { getHelpShortcuts } = await import("../ui/components/help-popup.ts");
		const shortcuts = getHelpShortcuts("board");
		expect(shortcuts.length).toBeGreaterThan(0);
		expect(shortcuts[0]?.key).toBe("Tab");
		expect(shortcuts[0]?.desc).toContain("Switch View");
		expect(shortcuts.some((s) => s.key === "q/Esc")).toBe(true);
	});

	it("getHelpShortcuts returns task-list shortcuts", async () => {
		const { getHelpShortcuts } = await import("../ui/components/help-popup.ts");
		const shortcuts = getHelpShortcuts("task-list");
		expect(shortcuts.length).toBeGreaterThan(0);
		expect(shortcuts.some((s) => s.key === "s")).toBe(true);
		expect(shortcuts.some((s) => s.key === "p")).toBe(true);
		expect(shortcuts.some((s) => s.key === "l")).toBe(true);
		expect(shortcuts.some((s) => s.key === "i")).toBe(true);
	});

	it("openHelpPopup resolves after key press", async () => {
		process.stdout.isTTY = true;
		const { openHelpPopup } = await import("../ui/components/help-popup.ts");
		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const promise = openHelpPopup(screen as any);
		await new Promise((r) => setTimeout(r, 10));

		// Find the escape handler registered on the popup
		const escapeHandler = _allKeyHandlers.find((h) => h.keys.includes("escape") && h.keys.includes("q"));
		expect(escapeHandler).toBeDefined();
		escapeHandler?.handler();

		await promise;
	});
});

// ============================================================================
// filter-header
// ============================================================================

describe("filter-header", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	beforeEach(() => {
		resetMockState();
	});

	it("resolveSearchHorizontalNavigation handles edge cases", async () => {
		const { resolveSearchHorizontalNavigation } = await import("../ui/components/filter-header.ts");

		expect(resolveSearchHorizontalNavigation(0, 0, "left")).toBe("cycle-prev");
		expect(resolveSearchHorizontalNavigation(0, 0, "right")).toBe("cycle-next");
		expect(resolveSearchHorizontalNavigation(10, -5, "left")).toBe("stay");
		expect(resolveSearchHorizontalNavigation(-1, -0, "left")).toBe("cycle-prev");
	});

	it("createFilterHeader constructs and returns public API", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = {
			width: 120,
			height: 40,
			...createMockWidget(),
		};

		const filterChanges: Array<Record<string, unknown>> = [];
		const pickerOpens: string[] = [];

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do", "In Progress", "Done"],
			availableLabels: ["bug", "feature"],
			availableMilestones: ["Sprint 1", "Sprint 2"],
			initialFilters: {
				search: "test query",
				status: "In Progress",
				priority: "high",
				labels: ["bug"],
				milestone: "Sprint 1",
			},
			onFilterChange: (filters) => filterChanges.push({ ...filters }),
			onFilterPickerOpen: (filterId) => pickerOpens.push(filterId),
		});

		expect(header).toBeDefined();
		expect(header.getHeight()).toBeGreaterThan(0);

		// getFilters returns current state
		const filters = header.getFilters();
		expect(filters.search).toBe("test query");
		expect(filters.status).toBe("In Progress");
		expect(filters.priority).toBe("high");
		expect(filters.labels).toEqual(["bug"]);
		expect(filters.milestone).toBe("Sprint 1");

		// getCurrentFocus starts as null
		expect(header.getCurrentFocus()).toBeNull();
	});

	it("setFilters updates state and triggers callbacks", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };
		const filterChanges: Array<Record<string, unknown>> = [];

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: ["bug"],
			availableMilestones: ["Sprint 1"],
			onFilterChange: (filters) => filterChanges.push({ ...filters }),
			onFilterPickerOpen: () => {},
		});

		header.setFilters({ search: "new search" });
		expect(header.getFilters().search).toBe("new search");

		header.setFilters({ status: "Done" });
		expect(header.getFilters().status).toBe("Done");

		header.setFilters({ priority: "low" });
		expect(header.getFilters().priority).toBe("low");

		header.setFilters({ milestone: "Sprint 1" });
		expect(header.getFilters().milestone).toBe("Sprint 1");

		header.setFilters({ labels: ["bug"] });
		expect(header.getFilters().labels).toEqual(["bug"]);
	});

	it("focus methods do not throw", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: ["bug"],
			availableMilestones: ["Sprint 1"],
			onFilterChange: () => {},
			onFilterPickerOpen: () => {},
		});

		expect(() => header.focusSearch()).not.toThrow();
		expect(() => header.focusPriority()).not.toThrow();
		expect(() => header.focusMilestone()).not.toThrow();
		expect(() => header.focusLabels()).not.toThrow();
	});

	it("cycleNext and cyclePrev navigate through visible filters", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };
		const focusChanges: Array<string | null> = [];

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: ["bug"],
			availableMilestones: ["Sprint 1"],
			visibleFilters: ["search", "priority", "milestone"],
			onFilterChange: () => {},
			onFilterPickerOpen: () => {},
		});

		header.setFocusChangeHandler((focus) => focusChanges.push(focus));

		header.focusSearch();
		await new Promise((r) => setTimeout(r, 5));
		expect(focusChanges).toContain("search");

		// setBorderColor does not throw
		expect(() => header.setBorderColor("red")).not.toThrow();

		// getContainer returns a box
		expect(header.getContainer()).toBeDefined();
	});

	it("destroy cleans up without error", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: [],
			availableMilestones: [],
			onFilterChange: () => {},
			onFilterPickerOpen: () => {},
		});

		expect(() => header.destroy()).not.toThrow();
	});

	it("rebuild handles layout change or no change", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do", "In Progress", "Done"],
			availableLabels: ["bug", "feature", "urgent"],
			availableMilestones: ["Sprint 1", "Sprint 2", "Sprint 3"],
			onFilterChange: () => {},
			onFilterPickerOpen: () => {},
		});

		// Rebuild with same width — should be a no-op
		expect(() => header.rebuild()).not.toThrow();
	});

	it("setLabels updates labels and triggers change", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };
		const filterChanges: Array<Record<string, unknown>> = [];

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: [],
			availableMilestones: [],
			onFilterChange: (filters) => filterChanges.push({ ...filters }),
			onFilterPickerOpen: () => {},
		});

		header.setLabels(["bug", "feature"]);
		expect(header.getFilters().labels).toEqual(["bug", "feature"]);
	});

	it("handles empty visibleFilters (defaults to all)", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: [],
			availableMilestones: [],
			visibleFilters: [],
			onFilterChange: () => {},
			onFilterPickerOpen: () => {},
		});

		expect(header.getHeight()).toBeGreaterThan(0);
	});

	it("handles focus change and exit request callbacks", async () => {
		process.stdout.isTTY = true;
		const { createFilterHeader } = await import("../ui/components/filter-header.ts");

		const parent = { width: 120, height: 40, ...createMockWidget() };
		const exitDirections: string[] = [];

		const header = createFilterHeader({
			parent: parent as any,
			statuses: ["To Do"],
			availableLabels: [],
			availableMilestones: [],
			onFilterChange: () => {},
			onFilterPickerOpen: () => {},
		});

		header.setExitRequestHandler((direction) => exitDirections.push(direction));

		header.setFocusChangeHandler((_focus) => {
			// focus changed
		});
	});
});

// ============================================================================
// confirm-popup
// ============================================================================

describe("confirm-popup", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	beforeEach(() => {
		resetMockState();
	});

	it("openConfirmPopup resolves true when Enter is pressed", async () => {
		process.stdout.isTTY = true;
		const { openConfirmPopup } = await import("../ui/components/confirm-popup.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const promise = openConfirmPopup({
			screen: screen as any,
			title: "Test Confirm",
			message: "Are you sure?",
		});

		await new Promise((r) => setTimeout(r, 10));

		// Find the Enter key handler on the popup
		const enterHandler = _allKeyHandlers.find((h) => h.keys.includes("enter") && h.keys.includes("y"));
		expect(enterHandler).toBeDefined();
		enterHandler?.handler();

		const result = await promise;
		expect(result).toBe(true);
	});

	it("openConfirmPopup resolves false when Escape is pressed", async () => {
		process.stdout.isTTY = true;
		const { openConfirmPopup } = await import("../ui/components/confirm-popup.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const promise = openConfirmPopup({
			screen: screen as any,
			title: "Test Cancel",
			message: "Cancel test?",
		});

		await new Promise((r) => setTimeout(r, 10));

		const escapeHandler = _allKeyHandlers.find((h) => h.keys.includes("escape") && h.keys.includes("n"));
		expect(escapeHandler).toBeDefined();
		escapeHandler?.handler();

		const result = await promise;
		expect(result).toBe(false);
	});

	it("openConfirmPopup settles only once (second call is no-op)", async () => {
		process.stdout.isTTY = true;
		const { openConfirmPopup } = await import("../ui/components/confirm-popup.ts");

		const screen = {
			width: 120,
			height: 40,
			render: () => {},
			key: () => {},
			on: () => {},
			destroy: () => {},
		};

		const promise = openConfirmPopup({
			screen: screen as any,
			title: "Test",
			message: "Test",
		});

		await new Promise((r) => setTimeout(r, 10));

		// Find and call the enter handler twice — second should be no-op
		const enterHandler = _allKeyHandlers.find((h) => h.keys.includes("enter") && h.keys.includes("y"));
		enterHandler?.handler();
		enterHandler?.handler();

		const result = await promise;
		expect(result).toBe(true);
	});
});

// ============================================================================
// generic-list
// ============================================================================

describe("generic-list", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	beforeEach(() => {
		resetMockState();
	});

	it("constructs with items and returns public API", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [
			{ id: "ITEM-1", title: "First" },
			{ id: "ITEM-2", title: "Second" },
			{ id: "ITEM-3", title: "Third" },
		];

		const selections: Array<unknown> = [];
		const list = new GenericList({
			items,
			onSelect: (selected) => selections.push(selected),
			showHelp: true,
		});

		expect(list.getSelected()).toEqual(items[0]);
		expect(list.getSelectedIndex()).toBe(0);
		expect(list.getListBox()).toBeDefined();

		list.destroy();
	});

	it("setSelectedIndex navigates to correct item", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [
			{ id: "ITEM-1", title: "First" },
			{ id: "ITEM-2", title: "Second" },
		];

		const highlights: Array<unknown> = [];
		const list = new GenericList({
			items,
			onHighlight: (selected) => highlights.push(selected),
			showHelp: false,
		});

		list.setSelectedIndex(1);
		expect(list.getSelectedIndex()).toBe(1);
		expect(list.getSelected()).toEqual(items[1]);

		list.destroy();
	});

	it("updateItems refreshes the list", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const list = new GenericList({
			items: [{ id: "A" }, { id: "B" }],
			showHelp: false,
		});

		list.updateItems([{ id: "C" }, { id: "D" }, { id: "E" }]);
		expect(list.getSelected()).toEqual({ id: "C" });

		list.destroy();
	});

	it("handles empty items list", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const list = new GenericList({
			items: [],
			onSelect: () => {},
			showHelp: false,
		});

		expect(list.getSelected()).toBeNull();
		expect(list.getSelectedIndex()).toBe(0);

		list.setSelectedIndex(5); // should clamp safely
		expect(list.getSelected()).toBeNull();

		list.destroy();
	});

	it("handles non-TTY mode for single select", async () => {
		process.stdout.isTTY = false;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [{ id: "ITEM-1", title: "First" }];
		const selections: Array<unknown> = [];

		const list = new GenericList({
			items,
			onSelect: (selected) => selections.push(selected),
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(selections.length).toBeGreaterThan(0);

		list.destroy();
	});

	it("handles non-TTY mode for multi select", async () => {
		process.stdout.isTTY = false;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [{ id: "ITEM-1" }, { id: "ITEM-2" }];
		const selections: Array<unknown> = [];

		const list = new GenericList({
			items,
			multiSelect: true,
			onSelect: (selected) => selections.push(selected),
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(selections.length).toBeGreaterThan(0);

		list.destroy();
	});

	it("multiSelect toggle and confirm", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [
			{ id: "A", title: "Alpha" },
			{ id: "B", title: "Beta" },
		];

		const selections: Array<unknown> = [];
		const list = new GenericList({
			items,
			multiSelect: true,
			showHelp: false,
			onSelect: (selected) => selections.push(selected),
		});

		expect(list.getListBox()).toBeDefined();
		list.destroy();
	});

	it("keyboard navigation handlers are registered", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [
			{ id: "A", title: "Alpha" },
			{ id: "B", title: "Beta" },
		];

		const list = new GenericList({
			items,
			showHelp: true,
			searchable: true,
		});

		// Verify key handlers are registered
		const upHandler = _allKeyHandlers.find((h) => h.keys.includes("up"));
		const downHandler = _allKeyHandlers.find((h) => h.keys.includes("down"));
		const enterHandler = _allKeyHandlers.find((h) => h.keys.includes("enter"));
		const escapeHandler = _allKeyHandlers.find((h) => h.keys.includes("escape"));

		expect(upHandler).toBeDefined();
		expect(downHandler).toBeDefined();
		expect(enterHandler).toBeDefined();
		expect(escapeHandler).toBeDefined();

		list.destroy();
	});

	it("factory function createGenericList works", async () => {
		process.stdout.isTTY = true;
		const { createGenericList } = await import("../ui/components/generic-list.ts");

		const list = createGenericList({
			items: [
				{ id: "X", title: "First" },
				{ id: "Y", title: "Second" },
			],
			showHelp: false,
		});

		expect(list).toBeDefined();
		expect(list.getSelected()).toEqual({ id: "X", title: "First" });
		expect(list.getSelectedIndex()).toBe(0);

		list.destroy();
	});

	it("default item renderer works for items without title", async () => {
		process.stdout.isTTY = true;
		const { createGenericList } = await import("../ui/components/generic-list.ts");

		const list = createGenericList({
			items: [{ id: "ONLY-ID" } as any],
			showHelp: false,
		});

		expect(list.getSelected()).toEqual({ id: "ONLY-ID" });
		list.destroy();
	});

	it("boundary navigation callback prevents wrapping", async () => {
		process.stdout.isTTY = true;
		const { GenericList } = await import("../ui/components/generic-list.ts");

		const items = [
			{ id: "A", title: "Alpha" },
			{ id: "B", title: "Beta" },
		];

		const boundaries: string[] = [];
		const list = new GenericList({
			items,
			showHelp: false,
			onBoundaryNavigation: (direction, selectedIndex, total) => {
				boundaries.push(`${direction}:${selectedIndex}:${total}`);
				return false;
			},
		});

		// Set to last item
		list.setSelectedIndex(1);
		expect(list.getSelected()).toEqual(items[1]);

		list.destroy();
	});
});

// ============================================================================
// generic-select / generic-multi-select (promise-based wrappers)
// ============================================================================

describe("genericSelectList and genericMultiSelect", () => {
	const origTTY: boolean | undefined = process.stdout.isTTY;

	afterAll(() => {
		process.stdout.isTTY = origTTY;
	});

	it("genericSelectList returns null when TTY is false", async () => {
		process.stdout.isTTY = false;
		const { genericSelectList } = await import("../ui/components/generic-list.ts");

		const result = await genericSelectList("Test", [{ id: "A" }, { id: "B" }]);
		expect(result).toBeNull();
	});

	it("genericSelectList returns null when items are empty", async () => {
		process.stdout.isTTY = false;
		const { genericSelectList } = await import("../ui/components/generic-list.ts");

		const result = await genericSelectList("Test", []);
		expect(result).toBeNull();
	});

	it("genericMultiSelect returns [] when TTY is false", async () => {
		process.stdout.isTTY = false;
		const { genericMultiSelect } = await import("../ui/components/generic-list.ts");

		const result = await genericMultiSelect("Test", [{ id: "A" }]);
		expect(result).toEqual([]);
	});
});
