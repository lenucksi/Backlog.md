import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import type { Task } from "../types/index.ts";
import { term } from "./termless-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

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

async function withIsTTY(value: boolean, fn: () => Promise<void>): Promise<void> {
	const orig = process.stdout.isTTY;
	Object.defineProperty(process.stdout, "isTTY", { value, configurable: true });
	try {
		await fn();
	} finally {
		Object.defineProperty(process.stdout, "isTTY", { value: orig, configurable: true });
	}
}

describe("renderBoardTui non-TTY", () => {
	it("logs kanban board when stdout is not a TTY", () =>
		withIsTTY(false, async () => {
			const { renderBoardTui } = await import("../ui/board.ts");
			const tasks = [makeTask({ id: "T-1", title: "My task", status: "To Do" })];
			const lines: string[] = [];
			const origLog = console.log;
			console.log = (...args: unknown[]) => lines.push(args.join(" "));

			await renderBoardTui(tasks, ["To Do"], "horizontal", 30);

			console.log = origLog;
			expect(lines.length).toBeGreaterThan(0);
		}));

	it("logs milestone board when milestone mode and not TTY", () =>
		withIsTTY(false, async () => {
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
		}));
});

// ============================================================================
// renderBoardTui — termless-based TUI tests
// ============================================================================

const canRunShell =
	process.platform !== "win32" && (process.env.RUN_INTERACTIVE_TUI_TESTS === "1" || process.env.CI === "true");

(canRunShell ? describe : describe.skip)("renderBoardTui termless", () => {
	let testDir: string;

	async function withBoard(fn: (t: ReturnType<typeof term>) => Promise<void>): Promise<void> {
		const t = term(120, 40);
		try {
			await t.spawn(["bun", join(process.cwd(), "src", "cli.ts"), "board"], {
				cwd: testDir,
			});
			await t.waitFor("To Do", 10000);
			await fn(t);
		} finally {
			await t.close().catch(() => {});
		}
	}

	beforeEach(async () => {
		testDir = createUniqueTestDir("board-tui");
		mkdirSync(testDir, { recursive: true });
		await $`git init -b main`.cwd(testDir).quiet();
		await $`git config user.email test@example.com`.cwd(testDir).quiet();
		await $`git config user.name Test`.cwd(testDir).quiet();
		const core = new Core(testDir);
		await initializeTestProject(core, "Board TUI Test");
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

	it("renders board with tasks and exits via q", async () => {
		await withBoard(async (t) => {
			expect(t.screen.getText()).toContain("To Do");
			expect(t.screen.getText()).toContain("First Task");
			t.press("q");
		});
	});

	it("navigates left/right between columns", async () => {
		await withBoard(async (t) => {
			t.press("right");
			await new Promise((r) => setTimeout(r, 30));
			t.press("left");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("navigates up/down within a column", async () => {
		await withBoard(async (t) => {
			t.press("down");
			await new Promise((r) => setTimeout(r, 30));
			t.press("up");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("activates search via / key", async () => {
		await withBoard(async (t) => {
			t.press("/");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("opens priority filter via p", async () => {
		await withBoard(async (t) => {
			t.press("p");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("enters and cancels move mode", async () => {
		await withBoard(async (t) => {
			t.press("m");
			await new Promise((r) => setTimeout(r, 30));
			t.press("Escape");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("opens help popup via ?", async () => {
		await withBoard(async (t) => {
			t.press("?");
			await new Promise((r) => setTimeout(r, 30));
			t.press("Escape");
			await new Promise((r) => setTimeout(r, 30));
			t.press("q");
		});
	});

	it("exits via Escape", async () => {
		await withBoard(async (t) => {
			t.press("Escape");
			await new Promise((r) => setTimeout(r, 200));
			expect(t.alive).toBe(false);
		});
	});
});
