import { afterEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import type { Task } from "../types/index.ts";
import BoardPage from "../web/components/BoardPage.tsx";

const createTask = (overrides: Partial<Task>): Task => ({
	id: "task-1",
	title: "Task",
	status: "To Do",
	assignee: [],
	labels: [],
	dependencies: [],
	createdDate: "2026-01-01",
	...overrides,
});

const tasks: Task[] = [
	createTask({
		id: "task-101",
		title: "Fix login bug",
		assignee: ["alice"],
		labels: ["bug"],
		milestone: "m-1",
		priority: "high",
	}),
	createTask({
		id: "task-102",
		title: "Write docs",
		assignee: ["bob"],
		labels: ["docs"],
		milestone: "m-2",
		priority: "medium",
	}),
	createTask({
		id: "task-103",
		title: "Improve board",
		status: "In Progress",
		assignee: ["alice"],
		labels: ["enhancement"],
		milestone: "m-1",
		priority: "low",
	}),
	createTask({
		id: "task-104",
		title: "Triage unassigned issue",
		labels: ["bug"],
		priority: "medium",
	}),
];

let activeRoot: Root | null = null;

const setupDom = (url = "http://localhost/board") => {
	const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url });
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
	globalThis.window = dom.window as unknown as Window & typeof globalThis;
	globalThis.document = dom.window.document as unknown as Document;
	globalThis.navigator = dom.window.navigator as unknown as Navigator;
	globalThis.localStorage = dom.window.localStorage as unknown as Storage;

	if (!window.matchMedia) {
		window.matchMedia = () =>
			({
				matches: false,
				media: "",
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
			}) as MediaQueryList;
	}

	const htmlElementPrototype = window.HTMLElement.prototype as unknown as {
		attachEvent?: () => void;
		detachEvent?: () => void;
	};
	if (typeof htmlElementPrototype.attachEvent !== "function") {
		htmlElementPrototype.attachEvent = () => {};
	}
	if (typeof htmlElementPrototype.detachEvent !== "function") {
		htmlElementPrototype.detachEvent = () => {};
	}
};

const renderBoardPage = (
	url?: string,
	options: { tasks?: Task[]; statuses?: string[]; availableLabels?: string[] } = {},
): HTMLElement => {
	setupDom(url);
	const container = document.getElementById("root");
	expect(container).toBeTruthy();
	const renderedTasks = options.tasks ?? tasks;
	const renderedStatuses = options.statuses ?? ["To Do", "In Progress", "Done"];
	activeRoot = createRoot(container as HTMLElement);
	act(() => {
		activeRoot?.render(
			<BrowserRouter>
				<BoardPage
					tasks={renderedTasks}
					statuses={renderedStatuses}
					milestones={[]}
					availableLabels={options.availableLabels ?? ["bug", "docs", "enhancement"]}
					milestoneEntities={[]}
					archivedMilestones={[]}
					isLoading={false}
					onEditTask={() => {}}
					onNewTask={() => {}}
				/>
			</BrowserRouter>,
		);
	});
	return container as HTMLElement;
};

const selectMultiSelectOption = async (container: HTMLElement, menuId: string, optionText: string) => {
	const button = container.querySelector(`button[aria-controls='${menuId}']`);
	expect(button).toBeTruthy();
	await clickElement(button as HTMLButtonElement);

	const menu = container.querySelector(`#${menuId}`);
	expect(menu).toBeTruthy();

	const option = Array.from(menu?.querySelectorAll("button") ?? []).find((b) => b.textContent?.trim() === optionText);
	expect(option).toBeTruthy();
	await clickElement(option as HTMLButtonElement);
};

const clickElement = async (element: Element) => {
	await act(async () => {
		element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
		await Promise.resolve();
	});
};

const expectVisibleTasks = (container: HTMLElement, expected: string[]) => {
	const text = container.textContent ?? "";
	for (const title of expected) {
		expect(text).toContain(title);
	}
	for (const task of tasks) {
		if (!expected.includes(task.title)) {
			expect(text).not.toContain(task.title);
		}
	}
};

const expectBoardFiltersInHeader = (container: HTMLElement) => {
	const toolbar = container.querySelector("[aria-label='Board view controls']");
	expect(toolbar).toBeTruthy();
	expect(toolbar?.textContent).toContain("All Tasks");
	expect(toolbar?.textContent).toContain("Milestone");

	const boardFilters = toolbar?.querySelector("[aria-label='Board filters']");
	expect(boardFilters).toBeTruthy();

	const assigneeBtn = container.querySelector(
		"button[aria-controls='board-assignee-filter-menu']",
	) as HTMLButtonElement | null;
	expect(assigneeBtn).toBeTruthy();
	expect(toolbar?.contains(assigneeBtn)).toBe(true);
	expect(assigneeBtn?.className).toContain("min-w-[180px]");
	expect(assigneeBtn?.className).toContain("rounded-lg");

	const priorityBtn = container.querySelector(
		"button[aria-controls='board-priority-filter-menu']",
	) as HTMLButtonElement | null;
	expect(priorityBtn).toBeTruthy();
	expect(toolbar?.contains(priorityBtn)).toBe(true);
	expect(priorityBtn?.className).toContain("min-w-[180px]");
	expect(priorityBtn?.className).toContain("rounded-lg");

	expect(container.querySelector("select[aria-label='Filter board by label']")).toBeNull();
	expect(container.querySelector("select[aria-label='Filter board by assignee']")).toBeNull();
	expect(container.querySelector("select[aria-label='Filter board by priority']")).toBeNull();
	const labelsButton = getBoardLabelsButton(container);
	expect(toolbar?.contains(labelsButton)).toBe(true);
	expect(labelsButton.className).toContain("min-w-[200px]");
	expect(labelsButton.className).toContain("rounded-lg");
	expect(labelsButton.className).toContain("border-gray-300");
	expect(labelsButton.className).toContain("focus:ring-stone-500");
};

const getBoardLabelsButton = (container: HTMLElement): HTMLButtonElement => {
	const button = container.querySelector("button[aria-controls='board-labels-filter-menu']");
	expect(button).toBeTruthy();
	return button as HTMLButtonElement;
};

const getBoardLabelOption = (container: HTMLElement, label: string): HTMLButtonElement => {
	const optionBtn = Array.from(container.querySelectorAll("#board-labels-filter-menu button")).find(
		(element) => element.textContent?.trim() === label,
	);
	expect(optionBtn).toBeTruthy();
	return optionBtn as HTMLButtonElement;
};

afterEach(() => {
	if (activeRoot) {
		act(() => {
			activeRoot?.unmount();
		});
		activeRoot = null;
	}
});

describe("Web board filters", () => {
	it("filters board cards by assignee, label, and priority while updating URL params", async () => {
		const container = renderBoardPage();

		expectBoardFiltersInHeader(container);
		expectVisibleTasks(container, ["Fix login bug", "Write docs", "Improve board", "Triage unassigned issue"]);

		await selectMultiSelectOption(container, "board-assignee-filter-menu", "alice");
		expect(new URLSearchParams(window.location.search).get("assignee")).toBe("alice");
		expectVisibleTasks(container, ["Fix login bug", "Improve board"]);

		await clickElement(getBoardLabelsButton(container));
		await clickElement(getBoardLabelOption(container, "bug"));
		expect(new URLSearchParams(window.location.search).getAll("label")).toEqual(["bug"]);
		expectVisibleTasks(container, ["Fix login bug"]);

		await clickElement(getBoardLabelOption(container, "enhancement"));
		expect(new URLSearchParams(window.location.search).getAll("label")).toEqual(["bug", "enhancement"]);
		expect(getBoardLabelsButton(container).textContent).toContain("2 selected");
		expectVisibleTasks(container, ["Fix login bug", "Improve board"]);

		await selectMultiSelectOption(container, "board-priority-filter-menu", "high");
		expect(new URLSearchParams(window.location.search).getAll("priority")).toEqual(["high"]);
		expectVisibleTasks(container, ["Fix login bug"]);
	});

	it("matches configured label casing against task labels", async () => {
		const container = renderBoardPage(undefined, {
			availableLabels: ["Bug", "Docs", "enhancement"],
		});

		await clickElement(getBoardLabelsButton(container));
		await clickElement(getBoardLabelOption(container, "Bug"));

		expect(new URLSearchParams(window.location.search).getAll("label")).toEqual(["Bug"]);
		expect(getBoardLabelsButton(container).textContent).toContain("Bug");
		expectVisibleTasks(container, ["Fix login bug", "Triage unassigned issue"]);
	});

	it("reads filters from URL params and clears them", async () => {
		const container = renderBoardPage("http://localhost/board?assignee=alice&label=bug&priority=high");

		expect(container.querySelector("button[aria-controls='board-assignee-filter-menu']")?.textContent).toContain(
			"alice",
		);
		expect(getBoardLabelsButton(container).textContent).toContain("bug");
		expect(container.querySelector("button[aria-controls='board-priority-filter-menu']")?.textContent).toContain(
			"high",
		);
		expectVisibleTasks(container, ["Fix login bug"]);

		const clearButton = Array.from(container.querySelectorAll("button")).find((button) =>
			button.textContent?.includes("Clear filters"),
		);
		expect(clearButton).toBeTruthy();
		await clickElement(clearButton as HTMLButtonElement);

		const searchParams = new URLSearchParams(window.location.search);
		expect(searchParams.get("assignee")).toBeNull();
		expect(searchParams.getAll("label")).toEqual([]);
		expect(searchParams.getAll("priority")).toEqual([]);
		expectVisibleTasks(container, ["Fix login bug", "Write docs", "Improve board", "Triage unassigned issue"]);
	});

	it("uses active board filters for milestone lane metadata", async () => {
		const container = renderBoardPage("http://localhost/board?lane=milestone");

		expect(container.textContent).toContain("m-1");
		expect(container.textContent).toContain("m-2");

		await selectMultiSelectOption(container, "board-assignee-filter-menu", "alice");

		const text = container.textContent ?? "";
		expect(text).toContain("Fix login bug");
		expect(text).toContain("Improve board");
		expect(text).not.toContain("m-2");
		expect(text).not.toContain("Write docs");
	});

	it("shows cleanup on the final configured status column when it is not named Done", () => {
		const container = renderBoardPage(undefined, {
			statuses: ["To Do", "Review", "Closed"],
			tasks: [createTask({ id: "task-200", title: "Closed task", status: "Closed" })],
		});

		const cleanupButtons = Array.from(container.querySelectorAll("button")).filter((button) =>
			button.textContent?.includes("Clean Up Old Tasks"),
		);
		expect(cleanupButtons).toHaveLength(1);
	});
});
