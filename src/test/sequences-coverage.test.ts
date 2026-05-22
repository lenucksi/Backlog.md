import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Task } from "../types/index.ts";

const createMockBox = () => ({
	setContent: () => {},
	destroy: () => {},
	key: () => {},
	style: {},
	getScroll: () => 0,
	scrollTo: () => {},
	focus: () => {},
	height: 20,
});

// Set up mocks at module level BEFORE any import of the tested module
mock.module("neo-neo-bblessed", () => {
	const box = createMockBox;
	return {
		tput: () => {},
		program: () => ({}),
		box,
		scrollablebox: box,
		screen: box,
		list: box,
		log: box,
		scrollabletext: box,
		text: box,
		textarea: box,
		textbox: box,
		line: box,
		default: { box, scrollablebox: box },
	};
});

mock.module("/home/jo/kit/claude-code-llm-kram/Backlog.md/src/ui/tui.ts", () => ({
	createScreen: () => ({
		append: () => {},
		key: () => {},
		render: () => {},
		destroy: () => {},
	}),
}));

type RunSequencesViewFn = (
	data: { unsequenced: Task[]; sequences: { index: number; tasks: Task[] }[] },
	core?: unknown,
) => Promise<void>;

let runSequencesView: RunSequencesViewFn;

function makeTask(id: string, title: string): Task {
	return {
		id,
		title,
		status: "To Do",
		assignee: [],
		createdDate: "2026-01-01",
		labels: [],
		dependencies: [],
		description: "",
	};
}

describe("runSequencesView", () => {
	beforeAll(async () => {
		const mod = await import("../ui/sequences.ts");
		runSequencesView = mod.runSequencesView;
	});

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

	describe("TUI mode with mocked dependencies", () => {
		let originalTty: boolean | undefined;

		beforeAll(() => {
			originalTty = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")?.value;
			Object.defineProperty(process.stdout, "isTTY", {
				value: true,
				configurable: true,
			});
		});

		afterAll(() => {
			Object.defineProperty(process.stdout, "isTTY", {
				value: originalTty,
				configurable: true,
			});
		});

		it("renders without errors with empty data", async () => {
			await expect(runSequencesView({ unsequenced: [], sequences: [] })).resolves.toBeUndefined();
		});

		it("renders without errors with unsequenced tasks", async () => {
			await expect(
				runSequencesView({
					unsequenced: [makeTask("u1", "Unseq")],
					sequences: [],
				}),
			).resolves.toBeUndefined();
		});

		it("renders without errors with sequences", async () => {
			await expect(
				runSequencesView({
					unsequenced: [],
					sequences: [{ index: 1, tasks: [makeTask("s1", "Seq")] }],
				}),
			).resolves.toBeUndefined();
		});

		it("renders without errors with both unsequenced and sequences", async () => {
			await expect(
				runSequencesView({
					unsequenced: [makeTask("u1", "Unseq")],
					sequences: [
						{
							index: 1,
							tasks: [makeTask("s1", "Seq1-T1"), makeTask("s2", "Seq1-T2")],
						},
						{ index: 2, tasks: [makeTask("s3", "Seq2-T1")] },
					],
				}),
			).resolves.toBeUndefined();
		});
	});
});
