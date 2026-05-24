import { describe, expect, test } from "bun:test";
import type { Task } from "../types/index.ts";
import { detectDeadlocks } from "../utils/deadlock-detection.ts";

function task(id: string, dependencies: string[] = []): Task {
	return {
		id,
		title: `Task ${id}`,
		status: "To Do",
		assignee: [],
		labels: [],
		dependencies,
		createdDate: "2024-01-01",
		rawContent: "",
	};
}

describe("detectDeadlocks", () => {
	test("returns empty array when there are no dependencies", () => {
		const tasks = [task("a"), task("b"), task("c")];
		expect(detectDeadlocks(tasks)).toEqual([]);
	});

	test("returns empty array when linear chain has no cycles", () => {
		const tasks = [task("a"), task("b", ["a"]), task("c", ["b"])];
		expect(detectDeadlocks(tasks)).toEqual([]);
	});

	test("detects simple 2-node cycle", () => {
		const tasks = [task("a", ["b"]), task("b", ["a"])];
		const result = detectDeadlocks(tasks);
		expect(result.length).toBe(1);
		expect(result[0]?.sort()).toEqual(["a", "b"]);
	});

	test("detects 3-node cycle", () => {
		const tasks = [task("a", ["b"]), task("b", ["c"]), task("c", ["a"])];
		const result = detectDeadlocks(tasks);
		expect(result.length).toBe(1);
		expect(result[0]?.sort()).toEqual(["a", "b", "c"]);
	});

	test("ignores dependencies to tasks outside the set", () => {
		const tasks = [task("a"), task("b", ["a"])];
		expect(detectDeadlocks(tasks)).toEqual([]);
	});

	test("detects cycle in presence of non-cyclic nodes", () => {
		const tasks = [task("a"), task("b", ["c"]), task("c", ["b"]), task("d", ["a"])];
		const result = detectDeadlocks(tasks);
		expect(result.length).toBe(1);
		expect(result[0]?.sort()).toEqual(["b", "c"]);
	});

	test("detects multiple independent cycles", () => {
		const tasks = [task("a", ["b"]), task("b", ["a"]), task("c", ["d"]), task("d", ["c"])];
		const result = detectDeadlocks(tasks);
		expect(result.length).toBe(2);
	});

	test("handles self-loop (single-node cycle)", () => {
		const tasks = [task("a", ["a"])];
		expect(detectDeadlocks(tasks)).toEqual([]);
	});

	test("handles empty task list", () => {
		expect(detectDeadlocks([])).toEqual([]);
	});
});
