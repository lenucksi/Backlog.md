import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { runSequencesView } from "../ui/sequences.ts";
import { term } from "./termless-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

function makeTask(id: string, title: string, status = "To Do") {
	return {
		id,
		title,
		status,
		description: "",
		priority: "medium" as const,
		labels: [] as string[],
		assignee: [] as string[],
		dependencies: [] as string[],
		createdDate: "2024-01-01",
	};
}

describe("runSequencesView", () => {
	describe("headless mode (via BACKLOG_HEADLESS)", () => {
		let logs: string[];
		const originalLog = console.log;

		beforeAll(() => {
			process.env.BACKLOG_HEADLESS = "1";
		});

		afterAll(() => {
			delete process.env.BACKLOG_HEADLESS;
		});

		beforeEach(() => {
			logs = [];
			console.log = (...args: string[]) => void logs.push(args.join(" "));
		});

		afterEach(() => {
			console.log = originalLog;
		});

		it("handles empty data", async () => {
			await runSequencesView({ unsequenced: [], sequences: [] });
			expect(logs).toEqual([""]);
		});

		it("prints unsequenced tasks", async () => {
			await runSequencesView({
				unsequenced: [makeTask("t1", "Task One")],
				sequences: [],
			});
			expect(logs).toEqual(["Unsequenced:\n  t1 - Task One\n"]);
		});

		it("prints sequences with tasks", async () => {
			await runSequencesView({
				unsequenced: [],
				sequences: [{ index: 1, tasks: [makeTask("t2", "Task Two")] }],
			});
			expect(logs).toEqual(["Sequence 1:\n  t2 - Task Two\n"]);
		});

		it("prints both unsequenced and sequences", async () => {
			await runSequencesView({
				unsequenced: [makeTask("u1", "Unseq")],
				sequences: [{ index: 1, tasks: [makeTask("s1", "Seq")] }],
			});
			expect(logs).toEqual(["Unsequenced:\n  u1 - Unseq\n\nSequence 1:\n  s1 - Seq\n"]);
		});

		it("handles multiple sequences and tasks", async () => {
			await runSequencesView({
				unsequenced: [],
				sequences: [
					{ index: 1, tasks: [makeTask("s1", "First"), makeTask("s2", "Second")] },
					{ index: 2, tasks: [makeTask("s3", "Third")] },
				],
			});
			expect(logs).toEqual(["Sequence 1:\n  s1 - First\n  s2 - Second\n\nSequence 2:\n  s3 - Third\n"]);
		});

		it("handles multiple unsequenced tasks", async () => {
			await runSequencesView({
				unsequenced: [makeTask("a", "A"), makeTask("b", "B"), makeTask("c", "C")],
				sequences: [],
			});
			expect(logs).toEqual(["Unsequenced:\n  a - A\n  b - B\n  c - C\n"]);
		});
	});
});

const canRunShell =
	process.platform !== "win32" && (process.env.RUN_INTERACTIVE_TUI_TESTS === "1" || process.env.CI === "true");
(canRunShell ? describe : describe.skip)("runSequencesView termless", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = createUniqueTestDir("sequences");
		mkdirSync(testDir, { recursive: true });
		await $`git init -b main`.cwd(testDir).quiet();
		await $`git config user.email test@example.com`.cwd(testDir).quiet();
		await $`git config user.name Test`.cwd(testDir).quiet();
		const core = new Core(testDir);
		await initializeTestProject(core, "Sequences Test");
		await core.createTask(
			{
				id: "task-a",
				title: "Task A",
				status: "To Do",
				priority: "medium",
				labels: [],
				assignee: [],
				dependencies: ["task-b"],
				createdDate: "2024-01-01",
				description: "",
			},
			false,
		);
		await core.createTask(
			{
				id: "task-b",
				title: "Task B",
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
	});

	afterEach(async () => {
		try {
			await safeCleanup(testDir);
		} catch {}
	});

	async function withSequences(fn: (t: ReturnType<typeof term>) => Promise<void>) {
		const t = term(120, 40);
		try {
			await t.spawn(["bun", join(process.cwd(), "src", "cli.ts"), "sequence", "list"], {
				cwd: testDir,
			});
			await t.waitFor("Sequence", 10000);
			await fn(t);
		} finally {
			await t.close().catch(() => {});
		}
	}

	it("renders sequences view with task dependencies", async () => {
		await withSequences(async (t) => {
			expect(t.screen.getText()).toContain("Sequence 1");
			expect(t.screen.getText()).toContain("TASK-A");
			t.press("q");
			await new Promise((r) => setTimeout(r, 30));
		});
	});
});
