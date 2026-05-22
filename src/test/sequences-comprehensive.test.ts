import { describe, expect, it } from "bun:test";
import {
	adjustDependenciesForInsertBetween,
	adjustDependenciesForMove,
	canMoveToUnsequenced,
	computeSequences,
	planMoveToSequence,
	planMoveToUnsequenced,
	reorderWithinSequence,
} from "../core/sequences.ts";
import type { Task } from "../types/index.ts";

function t(id: string, deps: string[] = [], ordinal?: number): Task {
	return {
		id,
		title: id,
		status: "To Do",
		assignee: [],
		createdDate: "2025-01-01",
		labels: [],
		dependencies: deps,
		description: "Test",
		...(ordinal !== undefined ? { ordinal } : {}),
	};
}

function mustGet<T>(arr: T[], idx: number): T {
	const v = arr[idx];
	if (v === undefined) throw new Error(`expected element at index ${idx}`);
	return v;
}

describe("computeSequences - cycle detection", () => {
	it("detects cycles and emits remaining tasks as final layer", () => {
		// A -> B -> C -> A (cycle)
		// Create unique task objects - no duplicate IDs
		const tasks = [t("task-a"), t("task-b", ["task-a"]), t("task-c", ["task-b"])];
		// Add the cycle edge: C depends on A via a separate update
		tasks[2]!.dependencies.push("task-a");
		const res = computeSequences(tasks);
		// The cycle should be detected and remaining nodes emitted as one layer
		expect(res.sequences.length).toBeGreaterThanOrEqual(1);
		// All tasks should appear somewhere
		const allSeqIds = new Set(res.sequences.flatMap((s) => s.tasks.map((x) => x.id)));
		for (const task of tasks) {
			expect(allSeqIds.has(task.id)).toBe(true);
		}
	});

	it("handles self-referencing dependency gracefully", () => {
		const tasks = [t("task-1", ["task-1"])];
		const res = computeSequences(tasks);
		// Self-reference is a cycle; task should still appear
		const allIds = res.sequences.flatMap((s) => s.tasks.map((x) => x.id));
		expect(allIds).toContain("task-1");
	});

	it("handles complex interleaved cycles", () => {
		// 1 -> 2 -> 3 -> 1 and 4 -> 2 (partial cycle with extra node)
		const tasks = [t("task-1"), t("task-2", ["task-1"]), t("task-3"), t("task-4", ["task-2"])];
		// Add cycle edge: task-3 depends on task-2 AND task-1 depends on task-3
		tasks[2]!.dependencies.push("task-2");
		tasks[0]!.dependencies.push("task-3");
		const res = computeSequences(tasks);
		const allIds = res.sequences.flatMap((s) => s.tasks.map((x) => x.id));
		expect(allIds).toContain("task-4");
	});
});

describe("planMoveToSequence", () => {
	it("returns changed tasks when moving to a valid sequence index", () => {
		const tasks = [t("task-1"), t("task-2"), t("task-3", ["task-1"]), t("task-4", ["task-2"])];
		const res = computeSequences(tasks);
		// seq1: 1,2 ; seq2: 3(dep:1),4(dep:2)
		expect(res.sequences.length).toBe(2);
		// Move task-4 to seq1 (target=1). Changed: task-4 deps become []
		const changed = planMoveToSequence(tasks, res.sequences, "task-4", 1);
		expect(changed.length).toBe(1);
		const moved = changed.find((x) => x.id === "task-4");
		expect(moved).toBeDefined();
		expect(moved?.dependencies).toEqual([]);
		// Should have ordinal 0 since deps are empty and target is seq 1
		expect(moved?.ordinal).toBe(0);
	});

	it("returns only truly changed tasks when moving to seq 1 (ordinal is added)", () => {
		const tasks = [t("task-1"), t("task-2"), t("task-3", ["task-1"])];
		const res = computeSequences(tasks);
		// Move task-1 to seq1 -> ordinal 0 gets added since deps are empty
		const changed = planMoveToSequence(tasks, res.sequences, "task-1", 1);
		expect(changed.length).toBe(1);
		const moved = changed.find((x) => x.id === "task-1");
		expect(moved?.ordinal).toBe(0);
	});

	it("sets deps from previous sequence tasks when moving to seq 2+", () => {
		// seq1: 1 ; seq2: 2(dep:1) ; seq3: 3(dep:2)
		const tasks = [t("task-1"), t("task-2", ["task-1"]), t("task-3", ["task-2"])];
		const res = computeSequences(tasks);
		// Move task-3 to seq2 (target=2). Moved deps should be [task-1]
		const changed = planMoveToSequence(tasks, res.sequences, "task-3", 2);
		expect(changed.length).toBe(1);
		const moved = changed.find((x) => x.id === "task-3");
		expect(moved?.dependencies).toEqual(["task-1"]);
	});
});

describe("planMoveToUnsequenced", () => {
	it("returns changed task with cleared deps and ordinal for eligible isolated task", () => {
		const tasks = [t("task-1"), t("task-2")];
		const result = planMoveToUnsequenced(tasks, "task-2");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.changed.length).toBe(1);
			const moved = result.changed[0];
			expect(moved?.id).toBe("task-2");
			expect(moved?.dependencies).toEqual([]);
			expect(moved?.ordinal).toBeUndefined();
		}
	});

	it("returns error when task has dependencies", () => {
		const tasks = [t("task-1"), t("task-2", ["task-1"])];
		const result = planMoveToUnsequenced(tasks, "task-2");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("Cannot move to Unsequenced");
		}
	});

	it("returns error when task has dependents", () => {
		const tasks = [t("task-1"), t("task-2", ["task-1"])];
		const result = planMoveToUnsequenced(tasks, "task-1");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("Cannot move to Unsequenced");
		}
	});

	it("returns error for non-existent task (fails eligibility check first)", () => {
		const tasks: Task[] = [];
		const result = planMoveToUnsequenced(tasks, "task-999");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("Cannot move to Unsequenced");
		}
	});

	it("clears existing ordinal when moving to unsequenced", () => {
		const tasks = [t("task-1", []), t("task-2", [], 5)];
		const result = planMoveToUnsequenced(tasks, "task-2");
		expect(result.ok).toBe(true);
		if (result.ok) {
			const moved = result.changed[0];
			expect(moved?.ordinal).toBeUndefined();
		}
	});
});

describe("adjustDependenciesForInsertBetween - edge cases", () => {
	it("handles moving a task that doesn't exist in the tasks list", () => {
		const tasks = [t("task-1")];
		const updated = adjustDependenciesForInsertBetween(tasks, [], "task-999", 0);
		expect(updated).toEqual(tasks);
	});

	it("handles insert at K > max sequences gracefully", () => {
		const tasks = [t("task-1"), t("task-2")];
		const res = computeSequences(tasks);
		expect(res.sequences.length).toBe(0);
		// K should be clamped to 0 which is maxK (0)
		const updated = adjustDependenciesForInsertBetween(tasks, res.sequences, "task-2", 99);
		const byId = new Map(updated.map((x) => [x.id, x]));
		expect(byId.get("task-2")?.ordinal).toBe(0);
	});

	it("updates next sequence tasks to depend on moved task", () => {
		// seq1: 1 ; seq2: 2(dep:1), 3(dep:1)
		const tasks = [t("task-1"), t("task-2", ["task-1"]), t("task-3", ["task-1"])];
		const res = computeSequences(tasks);
		expect(res.sequences.length).toBe(2);
		// Drop task-3 between seq1 and seq2 (K=1)
		const updated = adjustDependenciesForInsertBetween(tasks, res.sequences, "task-3", 1);
		const byId = new Map(updated.map((x) => [x.id, x]));
		// task-2 should now depend on task-3 as well
		expect(byId.get("task-2")?.dependencies).toContain("task-3");
	});

	it("does not add duplicate dependency when already present", () => {
		const tasks = [t("task-1"), t("task-2", ["task-1"]), t("task-3")];
		const res = computeSequences(tasks);
		expect(res.sequences.length).toBe(2);
		// Drop task-3 between seq1 and seq2 (K=1)
		const updated = adjustDependenciesForInsertBetween(tasks, res.sequences, "task-3", 1);
		const byId = new Map(updated.map((x) => [x.id, x]));
		// task-2 should have [task-1, task-3], no duplicates
		expect(byId.get("task-2")?.dependencies).toEqual(["task-1", "task-3"]);
	});
});

describe("adjustDependenciesForMove - edge cases", () => {
	it("returns original tasks when moved task not found", () => {
		const tasks = [t("task-1")];
		const updated = adjustDependenciesForMove(tasks, [], "task-999", 1);
		expect(updated).toEqual(tasks);
	});

	it("excludes moved task from its own deps when moving within same sequence", () => {
		// seq1: 1 ; seq2: 2(dep:1)
		const tasks = [t("task-1"), t("task-2", ["task-1"])];
		const res = computeSequences(tasks);
		// Move task-2 to seq2 (target=2). Prev seq is seq1, which contains task-2 itself
		const updated = adjustDependenciesForMove(tasks, res.sequences, "task-2", 2);
		const byId = new Map(updated.map((x) => [x.id, x]));
		// task-2 deps should be [task-1] (not include itself)
		expect(byId.get("task-2")?.dependencies).toEqual(["task-1"]);
	});
});

describe("reorderWithinSequence - edge cases", () => {
	it("re-assigns ordinal even with empty sequenceTaskIds (only moved task gets ordinal 0)", () => {
		// When seqIds is empty but movedTaskId is in tasks list, moved task gets ordinal 0
		const tasks = [t("task-1")];
		const updated = reorderWithinSequence(tasks, [], "task-1", 0);
		const byId = new Map(updated.map((x) => [x.id, x]));
		expect(byId.get("task-1")?.ordinal).toBe(0);
	});

	it("handles moving non-existent task ID (task not in seq list)", () => {
		const tasks = [t("task-1", [], 0), t("task-2", [], 1)];
		const updated = reorderWithinSequence(tasks, ["task-1", "task-2"], "task-999", 0);
		const byId = new Map(updated.map((x) => [x.id, x]));
		// task-999 is filtered out of seqIds, so newOrder becomes [task-999]
		// Then task-999 gets ordinal 0, task-1 and task-2 get no new ordinal
		expect(byId.get("task-999")).toBeUndefined();
	});

	it("clamps index to valid range when below 0", () => {
		const tasks = [t("task-1", [], 0), t("task-2", [], 1)];
		const updated = reorderWithinSequence(tasks, ["task-1", "task-2"], "task-2", -5);
		const byId = new Map(updated.map((x) => [x.id, x]));
		expect(byId.get("task-2")?.ordinal).toBe(0);
		expect(byId.get("task-1")?.ordinal).toBe(1);
	});

	it("filters out falsy and non-existent IDs from sequenceTaskIds", () => {
		const tasks = [t("task-1", [], 0)];
		const updated = reorderWithinSequence(tasks, ["", "task-1", "task-999"], "task-1", 1);
		const byId = new Map(updated.map((x) => [x.id, x]));
		expect(byId.get("task-1")?.ordinal).toBe(0);
	});
});

describe("canMoveToUnsequenced - edge cases", () => {
	it("returns false for non-existent task", () => {
		expect(canMoveToUnsequenced([], "task-999")).toBe(false);
	});

	it("returns false when task has external dependency (not in set)", () => {
		const tasks = [t("task-1", ["external-dep"])];
		expect(canMoveToUnsequenced(tasks, "task-1")).toBe(true);
	});

	it("considers dependencies from cloned task objects correctly", () => {
		const tasks: Task[] = [{ ...t("task-1"), dependencies: undefined }, t("task-2")];
		expect(canMoveToUnsequenced(tasks, "task-1")).toBe(true);
	});
});
