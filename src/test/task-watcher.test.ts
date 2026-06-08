import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { FSWatcher } from "node:fs";
import * as fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Core } from "../core/backlog.ts";
import type { Task } from "../types/index.ts";
import { watchTasks } from "../utils/task-watcher.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

describe("watchTasks", () => {
	let testDir: string;
	let tasksDir: string;
	let watchCallback: ((eventType: string, filename: string | Buffer | null) => void) | null;
	let mockWatcher: FSWatcher;

	beforeEach(async () => {
		testDir = createUniqueTestDir("task-watcher-test");
		tasksDir = join(testDir, "backlog", "tasks");
		await mkdir(tasksDir, { recursive: true });
		watchCallback = null;

		mockWatcher = { close: () => {} } as FSWatcher;

		spyOn(fs, "watch").mockImplementation(((
			_path: unknown,
			_options?: unknown,
			listener?: (eventType: string, filename: string | Buffer | null) => void,
		) => {
			if (listener) watchCallback = listener;
			return mockWatcher;
		}) as any);
	});

	afterEach(async () => {
		await safeCleanup(testDir);
	});

	const makeCore = (customLoadTask?: (id: string) => Promise<Task | null>): Core => {
		return {
			filesystem: {
				tasksDir,
				loadTask:
					customLoadTask ??
					(async (id: string) =>
						({
							id,
							title: `Task ${id}`,
							status: "To Do",
							assignee: [],
							createdDate: "2026-01-01",
							labels: [],
							dependencies: [],
						}) as Task),
			},
		} as unknown as Core;
	};

	const triggerEvent = async (eventType: string, filename: string | Buffer | null) => {
		if (watchCallback) {
			const result = (watchCallback as (...args: unknown[]) => unknown)(eventType, filename);
			if (result instanceof Promise) {
				await result;
			}
		}
	};

	it("returns a stop function", () => {
		const { stop } = watchTasks(makeCore(), {});
		expect(typeof stop).toBe("function");
		stop();
	});

	it("stop calls watcher.close", () => {
		const closeSpy = spyOn(mockWatcher, "close");
		const { stop } = watchTasks(makeCore(), {});
		stop();
		expect(closeSpy).toHaveBeenCalled();
	});

	it("stop does not throw when called multiple times", () => {
		const { stop } = watchTasks(makeCore(), {});
		stop();
		expect(() => stop()).not.toThrow();
	});

	it("filters files without .md extension", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });
		await triggerEvent("change", "task-1.txt");
		expect(onTaskChanged).not.toHaveBeenCalled();
	});

	it("filters files without task prefix", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });
		await triggerEvent("change", "readme.md");
		expect(onTaskChanged).not.toHaveBeenCalled();
	});

	it("filters when filename has no prefix pattern", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });
		await triggerEvent("change", "12345.md");
		expect(onTaskChanged).not.toHaveBeenCalled();
	});

	it("calls onTaskChanged on change event", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });
		await triggerEvent("change", "task-1.md");
		expect(onTaskChanged).toHaveBeenCalledTimes(1);
		expect(onTaskChanged.mock.calls[0]?.[0]).toBeDefined();
	});

	it("calls onTaskChanged on rename event when file exists on disk", async () => {
		// Create the file so Bun.file().exists() returns true
		await mkdir(tasksDir, { recursive: true });
		await writeFile(join(tasksDir, "task-exists.md"), "id: task-exists", "utf-8");

		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });

		await triggerEvent("rename", "task-exists.md");
		expect(onTaskChanged).toHaveBeenCalledTimes(1);
	});

	it("calls onTaskRemoved on rename event when file does not exist", async () => {
		const onTaskRemoved = spyOn({ fn: async (_id: string) => {} }, "fn");
		watchTasks(makeCore(), { onTaskRemoved: onTaskRemoved });

		await triggerEvent("rename", "task-nonexistent.md");
		expect(onTaskRemoved).toHaveBeenCalledTimes(1);
		expect(onTaskRemoved.mock.calls[0]?.[0]).toBe("task-nonexistent.md");
	});

	it("does not call onTaskChanged when loadTask returns null on change event", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		const loadTask = spyOn({ fn: async (_id: string) => null }, "fn");
		watchTasks(makeCore(loadTask), { onTaskChanged: onTaskChanged });

		await triggerEvent("change", "task-null.md");
		expect(onTaskChanged).not.toHaveBeenCalled();
	});

	it("handles null filename gracefully", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });
		await triggerEvent("change", null);
		expect(onTaskChanged).not.toHaveBeenCalled();
	});

	it("handles Buffer filename", async () => {
		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		watchTasks(makeCore(), { onTaskChanged: onTaskChanged });
		await triggerEvent("change", Buffer.from("task-1.md"));
		expect(onTaskChanged).toHaveBeenCalled();
	});

	it("handles loadTask throwing on rename event gracefully", async () => {
		// File exists on disk, but loadTask throws -> catch block in rename handler
		await mkdir(tasksDir, { recursive: true });
		await writeFile(join(tasksDir, "task-throws.md"), "id: task-throws", "utf-8");

		const onTaskChanged = spyOn({ fn: async (_task: Task) => {} }, "fn");
		const loadTask = spyOn(
			{
				fn: async (_id: string) => {
					throw new Error("fail");
				},
			},
			"fn",
		);
		watchTasks(makeCore(loadTask), { onTaskChanged: onTaskChanged });

		await triggerEvent("rename", "task-throws.md");
		expect(onTaskChanged).not.toHaveBeenCalled();
	});
});
