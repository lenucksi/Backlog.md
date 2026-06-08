import { describe, expect, it } from "bun:test";
import { calculateNewOrdinal, DEFAULT_ORDINAL_STEP, resolveOrdinalConflicts } from "../core/reorder.ts";

describe("calculateNewOrdinal", () => {
	it("returns default step when neither previous nor next exists", () => {
		const result = calculateNewOrdinal({});
		expect(result).toEqual({ ordinal: DEFAULT_ORDINAL_STEP, requiresRebalance: false });
	});

	it("returns default step when previous and next are null", () => {
		const result = calculateNewOrdinal({ previous: null, next: null });
		expect(result).toEqual({ ordinal: DEFAULT_ORDINAL_STEP, requiresRebalance: false });
	});

	it("places item halfway before the next ordinal", () => {
		const result = calculateNewOrdinal({ next: { id: "task-2", ordinal: 2000 } });
		expect(result.ordinal).toBe(1000);
		expect(result.requiresRebalance).toBe(false);
	});

	it("marks rebalance when next ordinal is too small", () => {
		const result = calculateNewOrdinal({ next: { id: "task-2", ordinal: 0.5 } });
		expect(result.ordinal).toBe(0.25);
		expect(result.requiresRebalance).toBe(false);
	});

	it("marks rebalance when next ordinal is 0 (candidate <= 0)", () => {
		const result = calculateNewOrdinal({ next: { id: "task-2", ordinal: 0 } });
		expect(result.ordinal).toBe(0);
		expect(result.requiresRebalance).toBe(true);
	});

	it("places item after previous ordinal plus default step", () => {
		const result = calculateNewOrdinal({ previous: { id: "task-1", ordinal: 1000 } });
		expect(result.ordinal).toBe(2000);
		expect(result.requiresRebalance).toBe(false);
	});

	it("uses custom default step", () => {
		const result = calculateNewOrdinal({ previous: { id: "task-1", ordinal: 1000 }, defaultStep: 500 });
		expect(result.ordinal).toBe(1500);
	});

	it("places item between previous and next when both exist with gap", () => {
		const result = calculateNewOrdinal({
			previous: { id: "task-1", ordinal: 1000 },
			next: { id: "task-2", ordinal: 2000 },
		});
		expect(result.ordinal).toBe(1500);
		expect(result.requiresRebalance).toBe(false);
	});

	it("does not require rebalance when gap is above EPSILON", () => {
		const result = calculateNewOrdinal({
			previous: { id: "task-1", ordinal: 1000 },
			next: { id: "task-2", ordinal: 1000.1 },
		});
		expect(result.requiresRebalance).toBe(false);
		expect(result.ordinal).toBe(1000.05);
	});

	it("requires rebalance when candidate reaches next ordinal boundary", () => {
		const result = calculateNewOrdinal({
			previous: { id: "task-1", ordinal: 1000 },
			next: { id: "task-2", ordinal: 1000.0000005 },
		});
		expect(result.requiresRebalance).toBe(true);
	});

	it("handles gap <= EPSILON by using prev + defaultStep", () => {
		const result = calculateNewOrdinal({
			previous: { id: "task-1", ordinal: 1000 },
			next: { id: "task-2", ordinal: 999 },
		});
		expect(result.ordinal).toBe(2000);
		expect(result.requiresRebalance).toBe(true);
	});

	it("marks infinite previous ordinal as requiring rebalance", () => {
		const result = calculateNewOrdinal({ previous: { id: "task-1", ordinal: Number.POSITIVE_INFINITY } });
		expect(result.requiresRebalance).toBe(true);
	});
});

describe("resolveOrdinalConflicts", () => {
	it("returns empty array for empty input", () => {
		expect(resolveOrdinalConflicts([])).toEqual([]);
	});

	it("handles single task with ordinal", () => {
		const tasks = [{ id: "task-1", ordinal: 1000 }];
		expect(resolveOrdinalConflicts(tasks)).toEqual([]);
	});

	it("handles single task without ordinal", () => {
		const tasks: Array<{ id: string; ordinal?: number }> = [{ id: "task-1" }];
		const result = resolveOrdinalConflicts(tasks);
		expect(result).toEqual([{ id: "task-1", ordinal: 1000 }]);
	});

	it("returns no updates when ordinals are already sequential", () => {
		const tasks = [
			{ id: "task-1", ordinal: 1000 },
			{ id: "task-2", ordinal: 2000 },
			{ id: "task-3", ordinal: 3000 },
		];
		expect(resolveOrdinalConflicts(tasks)).toEqual([]);
	});

	it("resolves conflicting ordinals by assigning next default step", () => {
		const tasks = [
			{ id: "task-1", ordinal: 1000 },
			{ id: "task-2", ordinal: 1000 },
			{ id: "task-3", ordinal: 1000 },
		];
		const result = resolveOrdinalConflicts(tasks);
		expect(result).toEqual([
			{ id: "task-2", ordinal: 2000 },
			{ id: "task-3", ordinal: 3000 },
		]);
	});

	it("assigns ordinals to tasks with undefined ordinal", () => {
		const tasks = [{ id: "task-1", ordinal: 1000 }, { id: "task-2" }, { id: "task-3" }];
		const result = resolveOrdinalConflicts(tasks);
		expect(result).toEqual([
			{ id: "task-2", ordinal: 2000 },
			{ id: "task-3", ordinal: 3000 },
		]);
	});

	it("supports forceSequential mode", () => {
		const tasks: Array<{ id: string; ordinal?: number }> = [
			{ id: "task-1", ordinal: 5000 },
			{ id: "task-2", ordinal: 5000 },
		];
		const result = resolveOrdinalConflicts(tasks, { forceSequential: true });
		expect(result).toEqual([
			{ id: "task-1", ordinal: 1000 },
			{ id: "task-2", ordinal: 2000 },
		]);
	});

	it("supports custom startOrdinal and defaultStep", () => {
		const tasks: Array<{ id: string; ordinal?: number }> = [{ id: "task-1" }, { id: "task-2" }];
		const result = resolveOrdinalConflicts(tasks, { startOrdinal: 100, defaultStep: 50 });
		expect(result).toEqual([
			{ id: "task-1", ordinal: 100 },
			{ id: "task-2", ordinal: 150 },
		]);
	});

	it("skips undefined task entries", () => {
		const tasks: Array<{ id: string; ordinal?: number }> = [
			{ id: "task-1", ordinal: 1000 },
			null as unknown as { id: string; ordinal?: number },
			{ id: "task-2" },
		];
		const result = resolveOrdinalConflicts(tasks);
		expect(result).toEqual([{ id: "task-2", ordinal: 2000 }]);
	});
});
