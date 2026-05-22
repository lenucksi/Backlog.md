import { describe, expect, it } from "bun:test";
import type { Task } from "../types/index.ts";
import { attachSubtaskSummaries } from "../utils/task-subtasks.ts";

function makeTask(overrides: Partial<Task>): Task {
	return {
		id: "task-1",
		title: "Parent Task",
		status: "To Do",
		assignee: [],
		createdDate: "2026-01-01",
		labels: [],
		dependencies: [],
		...overrides,
	};
}

describe("attachSubtaskSummaries", () => {
	it("returns task unchanged when it has no parent and no subtasks", () => {
		const task = makeTask({ id: "task-1", title: "Standalone" });
		const result = attachSubtaskSummaries(task, [task]);
		expect(result).toBe(task);
	});

	it("sets parentTaskTitle when parent is found", () => {
		const parent = makeTask({ id: "task-1", title: "Epic" });
		const child = makeTask({ id: "task-1.1", title: "Subtask", parentTaskId: "task-1" });
		const result = attachSubtaskSummaries(child, [parent, child]);
		expect(result.parentTaskTitle).toBe("Epic");
	});

	it("returns task unchanged when parentTaskId is set but parent not found", () => {
		const child = makeTask({ id: "task-1.1", title: "Orphan", parentTaskId: "task-999" });
		const result = attachSubtaskSummaries(child, [child]);
		expect(result).toBe(child);
	});

	it("sets parentTaskTitle when parent title differs from stored parentTaskTitle", () => {
		const parent = makeTask({ id: "task-1", title: "New Title" });
		const child = makeTask({
			id: "task-1.1",
			title: "Subtask",
			parentTaskId: "task-1",
			parentTaskTitle: "Old Title",
		});
		const result = attachSubtaskSummaries(child, [parent, child]);
		expect(result.parentTaskTitle).toBe("New Title");
	});

	it("does not override parentTaskTitle when title matches existing", () => {
		const parent = makeTask({ id: "task-1", title: "Epic" });
		const child = makeTask({
			id: "task-1.1",
			title: "Subtask",
			parentTaskId: "task-1",
			parentTaskTitle: "Epic",
		});
		const result = attachSubtaskSummaries(child, [parent, child]);
		expect(result.parentTaskTitle).toBe("Epic");
	});

	it("collects and sorts subtask summaries", () => {
		const parent = makeTask({ id: "task-1", title: "Parent" });
		const sub1 = makeTask({ id: "task-1.10", title: "Sub B", parentTaskId: "task-1" });
		const sub2 = makeTask({ id: "task-1.2", title: "Sub A", parentTaskId: "task-1" });
		const result = attachSubtaskSummaries(parent, [parent, sub1, sub2]);
		expect(result.subtasks).toEqual(["task-1.2", "task-1.10"]);
		expect(result.subtaskSummaries).toEqual([
			{ id: "task-1.2", title: "Sub A" },
			{ id: "task-1.10", title: "Sub B" },
		]);
	});

	it("handles both parent and subtasks simultaneously", () => {
		const grandparent = makeTask({ id: "task-0", title: "Grandparent" });
		const parent = makeTask({
			id: "task-1",
			title: "Parent",
			parentTaskId: "task-0",
			parentTaskTitle: "Old GP",
		});
		const child = makeTask({ id: "task-1.1", title: "Child", parentTaskId: "task-1" });
		const result = attachSubtaskSummaries(parent, [grandparent, parent, child]);
		expect(result.parentTaskTitle).toBe("Grandparent");
		expect(result.subtaskSummaries).toEqual([{ id: "task-1.1", title: "Child" }]);
	});
});
