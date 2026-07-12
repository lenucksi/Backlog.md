/* Detail pane rendering for the task viewer */

import type { BoxInterface, LineInterface, ScreenInterface, ScrollableTextInterface } from "neo-neo-bblessed";
import { box, line, scrollabletext } from "neo-neo-bblessed";
import type { Task } from "../types/index.ts";
import {
	computeHeaderLineCount,
	type GenerateDetailContentOptions,
	generateDetailContent,
} from "./task-detail-content.ts";
import { LAYOUT } from "./task-viewer-layout.ts";
import type { PendingSearchWrap } from "./task-viewer-state.ts";
import { shouldMoveFromDetailBoundaryToSearch } from "./task-viewer-state.ts";

export interface DetailPaneCallbacks {
	getCurrentFocus(): "list" | "detail" | "filters";
	setCurrentFocus(focus: "list" | "detail" | "filters"): void;
	setPendingSearchWrap(wrap: PendingSearchWrap): void;
	focusTaskList(): void;
	focusSearchInput(): void;
	setActivePane(pane: "list" | "detail" | "none"): void;
	updateHelpBar(): void;
	screenRender(): void;
}

export interface DetailPaneWidgets {
	headerDetailBox: BoxInterface | undefined;
	divider: LineInterface | undefined;
	descriptionBox: ScrollableTextInterface | undefined;
}

export function renderDetailPane(
	detailPane: BoxInterface,
	screen: ScreenInterface,
	currentSelectedTask: Task | null,
	noResultsMessage: string | null,
	_currentFocus: "list" | "detail" | "filters",
	statusStyleOptions: GenerateDetailContentOptions["statusStyleOptions"],
	resolveMilestoneLabel: (m: string) => string,
	availableLabels: string[],
	options: { title?: string },
	callbacks: DetailPaneCallbacks,
): DetailPaneWidgets {
	let descriptionBox: ScrollableTextInterface | undefined;

	const configureDetailBox = (boxInstance: ScrollableTextInterface) => {
		descriptionBox = boxInstance;
		// aislop-ignore-next-line double-type-assertion -- required per AGENTS.md
		const scrollable = boxInstance as unknown as {
			scroll?: (offset: number) => void;
			setScroll?: (offset: number) => void;
			setScrollPerc?: (perc: number) => void;
			getScroll?: () => number;
		};

		const pageAmount = () => {
			const height = typeof boxInstance.height === "number" ? boxInstance.height : 0;
			return height > 0 ? Math.max(1, height - 3) : 0;
		};

		boxInstance.key(["up", "k"], () => {
			if (!shouldMoveFromDetailBoundaryToSearch("up", scrollable.getScroll?.() ?? 0)) {
				return true;
			}
			callbacks.setPendingSearchWrap(null);
			callbacks.focusSearchInput();
			return false;
		});

		boxInstance.key(["pageup", "b"], () => {
			const delta = pageAmount();
			if (delta > 0) {
				scrollable.scroll?.(-delta);
				callbacks.screenRender();
			}
			return false;
		});

		boxInstance.key(["pagedown", "space"], () => {
			const delta = pageAmount();
			if (delta > 0) {
				scrollable.scroll?.(delta);
				callbacks.screenRender();
			}
			return false;
		});

		boxInstance.key(["home", "g"], () => {
			scrollable.setScroll?.(0);
			callbacks.screenRender();
			return false;
		});

		boxInstance.key(["end", "G"], () => {
			scrollable.setScrollPerc?.(100);
			callbacks.screenRender();
			return false;
		});

		boxInstance.on("focus", () => {
			callbacks.setCurrentFocus("detail");
			callbacks.setActivePane("detail");
			callbacks.updateHelpBar();
			callbacks.screenRender();
		});

		boxInstance.on("blur", () => {
			if (callbacks.getCurrentFocus() !== "detail") {
				callbacks.setActivePane(callbacks.getCurrentFocus() === "list" ? "list" : "none");
				callbacks.screenRender();
			}
		});

		boxInstance.key(["left", "h"], () => {
			callbacks.focusTaskList();
			return false;
		});

		boxInstance.key(["escape"], () => {
			callbacks.focusTaskList();
			return false;
		});

		if (callbacks.getCurrentFocus() === "detail") {
			setImmediate(() => boxInstance.focus());
		}
	};

	let headerDetailBox: BoxInterface | undefined;
	let divider: LineInterface | undefined;

	if (noResultsMessage) {
		screen.title = options.title || "Backlog Tasks";

		headerDetailBox = box({
			parent: detailPane,
			top: 0,
			left: 1,
			right: 1,
			height: "shrink",
			tags: true,
			wrap: true,
			scrollable: false,
			padding: LAYOUT.DETAIL_CONTENT_PADDING,
			content: "{bold}No tasks to display{/bold}",
		});

		descriptionBox = undefined;
		divider = undefined;
		const messageBox = scrollabletext({
			parent: detailPane,
			top: (typeof headerDetailBox.bottom === "number" ? headerDetailBox.bottom : 0) + 1,
			left: 1,
			right: 1,
			bottom: 1,
			keys: true,
			vi: true,
			mouse: true,
			tags: true,
			wrap: true,
			padding: { ...LAYOUT.DETAIL_CONTENT_PADDING, top: 0, bottom: 0 },
			content: noResultsMessage,
		});

		configureDetailBox(messageBox);

		return { headerDetailBox, divider, descriptionBox };
	}

	if (!currentSelectedTask) {
		return { headerDetailBox: undefined, divider: undefined, descriptionBox: undefined };
	}

	screen.title = `Task ${currentSelectedTask.id} - ${currentSelectedTask.title}`;

	const isPastDueDate = currentSelectedTask.dueDate ? new Date(currentSelectedTask.dueDate) < new Date() : undefined;

	const detailContent = generateDetailContent(currentSelectedTask, {
		statusStyleOptions,
		resolveMilestoneLabel,
		availableLabels,
		isPastDueDate,
	});

	const detailPaneWidth = typeof detailPane.width === "number" ? detailPane.width : 60;
	const availableWidth = detailPaneWidth - 6;

	const headerLineCount = computeHeaderLineCount(detailContent.headerContent, availableWidth);

	headerDetailBox = box({
		parent: detailPane,
		top: 0,
		left: 1,
		right: 1,
		height: headerLineCount,
		tags: true,
		wrap: true,
		scrollable: false,
		padding: LAYOUT.DETAIL_CONTENT_PADDING,
		content: detailContent.headerContent.join("\n"),
	});

	divider = line({
		parent: detailPane,
		top: headerLineCount,
		left: 1,
		right: 1,
		orientation: "horizontal",
		style: { fg: "gray" },
	});

	const bodyContainer = scrollabletext({
		parent: detailPane,
		top: headerLineCount + 1,
		left: 1,
		right: 1,
		bottom: 1,
		keys: true,
		vi: true,
		mouse: true,
		tags: true,
		wrap: true,
		padding: { ...LAYOUT.DETAIL_CONTENT_PADDING, top: 0, bottom: 0 },
		content: detailContent.bodyContent.join("\n"),
	});

	configureDetailBox(bodyContainer);

	return { headerDetailBox, divider, descriptionBox };
}

export function destroyDetailWidgets(widgets: DetailPaneWidgets): void {
	if (widgets.headerDetailBox) widgets.headerDetailBox.destroy();
	if (widgets.divider) widgets.divider.destroy();
	if (widgets.descriptionBox) widgets.descriptionBox.destroy();
}
