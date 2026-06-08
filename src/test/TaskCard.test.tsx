import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import type { Task } from "../types/index.ts";
import TaskCard from "../web/components/TaskCard.tsx";

const baseTask: Task = {
	id: "TASK-1",
	title: "Test Task",
	status: "To Do",
	assignee: [],
	createdDate: "2025-01-01",
	labels: [],
	dependencies: [],
};

describe("TaskCard", () => {
	it("renders basic task info", () => {
		const html = renderToString(
			<TaskCard task={baseTask} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("TASK-1");
		expect(html).toContain("Test Task");
	});

	it("renders without labels when labels array is empty", () => {
		const task = { ...baseTask, labels: [] };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).not.toContain("bg-gray-100");
	});

	it("renders priority badge for high priority", () => {
		const task = { ...baseTask, priority: "high" as const };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("High");
		expect(html).toContain("border-l-red-500");
	});

	it("renders priority badge for medium priority", () => {
		const task = { ...baseTask, priority: "medium" as const };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("Med");
		expect(html).toContain("border-l-yellow-500");
	});

	it("renders priority badge for low priority", () => {
		const task = { ...baseTask, priority: "low" as const };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("Low");
		expect(html).toContain("border-l-green-500");
	});

	it("renders default priority styling when no priority set", () => {
		const task = { ...baseTask, priority: undefined };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("border-l-gray-300");
		expect(html).not.toContain("High");
		expect(html).not.toContain("Med");
		expect(html).not.toContain("Low");
	});

	it("shows labels when present", () => {
		const task = { ...baseTask, labels: ["bug", "frontend"] };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("bug");
		expect(html).toContain("frontend");
	});

	it("shows +N overflow when more than 3 labels", () => {
		const task = { ...baseTask, labels: ["a", "b", "c", "d", "e"] };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("a");
		expect(html).toContain("b");
		expect(html).toContain("c");
		// React renders + as +<!-- -->N
		expect(html).toContain("+<!-- -->2</span>");
		expect(html).not.toContain(">d<");
		expect(html).not.toContain(">e<");
	});

	it("shows assignee when present", () => {
		const task = { ...baseTask, assignee: ["alice"] };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("alice");
	});

	it("does not show assignee section when assignee is empty", () => {
		const task = { ...baseTask, assignee: [] };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).not.toContain("flex gap-1 truncate max-w-[80px]");
	});

	it("renders cross-branch indicator when task has a branch", () => {
		const task = { ...baseTask, branch: "feature-x" };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("feature-x");
		expect(html).toContain("opacity-75");
		expect(html).toContain("cursor-not-allowed");
		expect(html).toContain("border-dashed");
	});

	it("is draggable when task has no branch", () => {
		const task = { ...baseTask };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("cursor-pointer");
	});

	it("renders formatRelativeDate correctly for today", () => {
		// Create a task with today's date
		const now = new Date();
		const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const task = { ...baseTask, createdDate: dateStr };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("today");
	});

	it("renders formatRelativeDate correctly for yesterday", () => {
		const date = new Date();
		date.setDate(date.getDate() - 1);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const task = { ...baseTask, createdDate: dateStr };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("yesterday");
	});

	it("renders formatRelativeDate correctly for days ago", () => {
		const date = new Date();
		date.setDate(date.getDate() - 3);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const task = { ...baseTask, createdDate: dateStr };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("d ago");
	});

	it("renders formatRelativeDate correctly for weeks ago", () => {
		const date = new Date();
		date.setDate(date.getDate() - 10);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const task = { ...baseTask, createdDate: dateStr };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("w ago");
	});

	it("renders formatRelativeDate correctly for months ago", () => {
		const date = new Date();
		date.setDate(date.getDate() - 45);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const task = { ...baseTask, createdDate: dateStr };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("mo ago");
	});

	it("renders formatRelativeDate correctly for years ago", () => {
		const date = new Date();
		date.setFullYear(date.getFullYear() - 2);
		const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
		const task = { ...baseTask, createdDate: dateStr };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("y ago");
	});

	it("renders formatRelativeDate with datetime format containing time", () => {
		// Use an old-enough date so timezone offset won't flip the day
		const task = { ...baseTask, createdDate: "2024-01-15 14:30" };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toMatch(/\d+[dwmy]/);
	});

	it("renders with long titles without breaking", () => {
		const task = { ...baseTask, title: "A".repeat(200) };
		const html = renderToString(
			<TaskCard task={task} onUpdate={() => {}} onEdit={() => {}} />,
		);
		expect(html).toContain("A".repeat(200));
	});

	it("renders status prop correctly via data attributes", () => {
		const html = renderToString(
			<TaskCard task={baseTask} onUpdate={() => {}} onEdit={() => {}} status="In Progress" />,
		);
		expect(html).toContain("TASK-1");
		expect(html).toContain("Test Task");
	});

	it("renders with laneId without error", () => {
		const html = renderToString(
			<TaskCard task={baseTask} onUpdate={() => {}} onEdit={() => {}} laneId="lane-1" />,
		);
		expect(html).toContain("TASK-1");
	});
});
