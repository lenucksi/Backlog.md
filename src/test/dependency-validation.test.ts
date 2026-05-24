import { describe, expect, it } from "bun:test";
import type { Task } from "../types/index.ts";
import { findCyclePath, validateDependencyChange } from "../utils/dependency-validation.ts";

function makeTask(id: string, dependencies: string[]): Task {
	return {
		id,
		title: `Task ${id}`,
		status: "To Do",
		dependencies,
	} as Task;
}

describe("findCyclePath", () => {
	it("returns null when no cycle exists (simple case)", () => {
		const tasks = [makeTask("A", ["B"]), makeTask("B", [])];
		const result = findCyclePath("A", ["B"], tasks);
		expect(result).toBeNull();
	});

	it("detects a direct cycle (A → B → A)", () => {
		const tasks = [makeTask("A", ["B"]), makeTask("B", ["A"])];
		const result = findCyclePath("A", ["B"], tasks);
		expect(result).not.toBeNull();
		expect(result![0]).toBe("B");
		expect(result![result!.length - 1]).toBe("A");
	});

	it("detects a complex cycle (A → B → C → A)", () => {
		const tasks = [makeTask("A", ["B"]), makeTask("B", ["C"]), makeTask("C", ["A"])];
		const result = findCyclePath("A", ["B"], tasks);
		expect(result).not.toBeNull();
		expect(result![result!.length - 1]).toBe("A");
	});

	it("detects self-loop (A → A)", () => {
		const tasks = [makeTask("A", [])];
		const result = findCyclePath("A", ["A"], tasks);
		expect(result).not.toBeNull();
	});

	it("detects direct self-dependency", () => {
		const tasks = [makeTask("A", [])];
		const result = findCyclePath("A", ["A"], tasks);
		expect(result).not.toBeNull();
	});

	it("returns null when no tasks exist", () => {
		const result = findCyclePath("A", ["B"], []);
		expect(result).toBeNull();
	});

	it("escapes cycle via intermediate task deps (B depends on C, C depends on A)", () => {
		const tasks = [makeTask("A", ["B"]), makeTask("B", ["C"]), makeTask("C", ["A"])];
		const result = findCyclePath("A", ["B"], tasks);
		expect(result).not.toBeNull();
	});
});

describe("validateDependencyChange", () => {
	it("returns { valid: true } when no cycle", () => {
		const tasks = [makeTask("A", ["B"]), makeTask("B", [])];
		const result = validateDependencyChange("A", ["B"], tasks);
		expect(result.valid).toBe(true);
	});

	it("returns { valid: false, cycle } when cycle detected", () => {
		const tasks = [makeTask("A", ["B"]), makeTask("B", ["C"]), makeTask("C", ["A"])];
		const result = validateDependencyChange("A", ["B"], tasks);
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.cycle.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("handles empty newDependencies", () => {
		const tasks = [makeTask("A", []), makeTask("B", ["A"])];
		const result = validateDependencyChange("A", [], tasks);
		expect(result.valid).toBe(true);
	});
});
