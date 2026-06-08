import { describe, expect, it } from "bun:test";
import { normalizeAssignee } from "../utils/assignee.ts";

describe("normalizeAssignee", () => {
	it("should convert string assignee to array", () => {
		const task: { assignee: string | string[] } = { assignee: "user1" };
		normalizeAssignee(task);
		expect(task.assignee).toEqual(["user1"]);
	});

	it("should keep array assignee unchanged", () => {
		const task: { assignee: string | string[] } = { assignee: ["user1", "user2"] };
		normalizeAssignee(task);
		expect(task.assignee).toEqual(["user1", "user2"]);
	});

	it("should set empty array for undefined assignee", () => {
		const task: { assignee?: string | string[] } = {};
		normalizeAssignee(task);
		expect(task.assignee).toEqual([]);
	});

	it("should set empty array for null assignee", () => {
		const task = { assignee: null };
		normalizeAssignee(task as unknown as { assignee?: string | string[] });
		expect(task.assignee as unknown as string[]).toEqual([]);
	});
});
