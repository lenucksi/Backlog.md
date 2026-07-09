// @ts-nocheck — LSP zeigt React-Type-Errors durch globales tsconfig (harmlos)
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

// Plugin muss VOR allen @opentui/solid-imports registriert werden
import "@opentui/solid/preload";

let testRender: typeof import("@opentui/solid").testRender;
let createComponent: typeof import("solid-js").createComponent;
let TaskDetail: typeof import("../tui2/components/task-detail").TaskDetail;
let Core: typeof import("../core/backlog").Core;

let testDir: string;

beforeAll(async () => {
	const mod = await import("@opentui/solid");
	testRender = mod.testRender;
	const solid = await import("solid-js");
	createComponent = solid.createComponent;
	const taskDetailMod = await import("../tui2/components/task-detail");
	TaskDetail = taskDetailMod.TaskDetail;
	const coreMod = await import("../core/backlog");
	Core = coreMod.Core;

	testDir = createUniqueTestDir("tui2-poc");
	const core = new Core(testDir);
	await core.getContentStore();
	await core.createTask({
		id: "TASK-1",
		title: "Task Alpha",
		priority: "high",
		status: "To Do",
		assignee: [],
		labels: [],
		dependencies: [],
	});
	await core.createTask({
		id: "TASK-2",
		title: "Task Beta",
		priority: "medium",
		status: "In Progress",
		assignee: [],
		labels: [],
		dependencies: [],
	});
	await core.createTask({
		id: "TASK-3",
		title: "Task Gamma",
		priority: "low",
		status: "Done",
		assignee: [],
		labels: [],
		dependencies: [],
	});

	const loaded = await core.loadTasks();
	if (loaded.length !== 3) {
		throw new Error(`Expected 3 tasks, got ${loaded.length}`);
	}
});

afterAll(async () => {
	await safeCleanup(testDir);
});

function mockTask(overrides = {}) {
	return {
		id: "TASK-1",
		title: "Mock Task",
		status: "To Do",
		priority: "high",
		description: "A test task description",
		assignee: ["alice"],
		labels: ["bug", "frontend"],
		milestone: "v1.0",
		...overrides,
	};
}

describe("TaskDetail", () => {
	test("renders task id and title", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask() }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("TASK-1");
			expect(frame).toContain("Mock Task");
		} finally {
			t.renderer.destroy();
		}
	});

	test("renders status badge", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ status: "Done" }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("Done");
		} finally {
			t.renderer.destroy();
		}
	});

	test("renders priority", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ priority: "high" }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("high");
		} finally {
			t.renderer.destroy();
		}
	});

	test("renders description when present", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ description: "Hello World" }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("Hello World");
		} finally {
			t.renderer.destroy();
		}
	});

	test("renders labels when present", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ labels: ["bug", "ui"] }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("bug");
			expect(frame).toContain("ui");
		} finally {
			t.renderer.destroy();
		}
	});

	test("renders assignee when present", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ assignee: ["bob"] }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("bob");
		} finally {
			t.renderer.destroy();
		}
	});

	test("renders milestone when present", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ milestone: "sprint-1" }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).toContain("sprint-1");
		} finally {
			t.renderer.destroy();
		}
	});

	test("does not render description when absent", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ description: undefined }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).not.toContain("Description:");
		} finally {
			t.renderer.destroy();
		}
	});

	test("does not render labels when empty", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ labels: [] }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).not.toContain("Labels:");
		} finally {
			t.renderer.destroy();
		}
	});

	test("does not render assignee when empty", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ assignee: [] }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).not.toContain("Assignee:");
		} finally {
			t.renderer.destroy();
		}
	});

	test("does not render milestone when absent", async () => {
		const t = await testRender(() => createComponent(TaskDetail, { task: mockTask({ milestone: undefined }) }), {
			width: 80,
			height: 24,
		});
		try {
			await t.waitForVisualIdle();
			const frame = t.captureCharFrame();
			expect(frame).not.toContain("Milestone:");
		} finally {
			t.renderer.destroy();
		}
	});
});
