/* Pure content-formatting functions for task detail views (no blessed dependency) */

import {
	buildAcceptanceCriteriaItems,
	buildDefinitionOfDoneItems,
	formatDateForDisplay,
} from "../formatters/task-plain-text.ts";
import type { Milestone, Task } from "../types/index.ts";
import { formatChecklistItem } from "./checklist.ts";
import { transformCodePaths } from "./code-path.ts";
import { formatHeading } from "./heading.ts";
import { formatStatusWithIcon, getStatusColor, type StatusStyleOptions } from "./status-icon.ts";

export interface GenerateDetailContentOptions {
	statusStyleOptions: StatusStyleOptions;
	resolveMilestoneLabel: (m: string) => string;
	availableLabels: string[];
	isPastDueDate?: boolean;
}

export function generateDetailContent(
	task: Task,
	options: GenerateDetailContentOptions,
): { headerContent: string[]; bodyContent: string[] } {
	const { statusStyleOptions, resolveMilestoneLabel, isPastDueDate } = options;

	const headerContent = [
		` {${getStatusColor(task.status, statusStyleOptions)}-fg}${formatStatusWithIcon(task.status, statusStyleOptions)}{/} {bold}{blue-fg}${task.id}{/blue-fg}{/bold} - ${task.title}`,
	];

	const isCrossBranch = Boolean((task as Task & { branch?: string }).branch);
	if (isCrossBranch) {
		const branchName = (task as Task & { branch?: string }).branch;
		headerContent.push(
			` {yellow-fg}⚠ Read-only:{/} This task exists in branch {green-fg}${branchName}{/}. Switch to that branch to edit it.`,
		);
	}

	const bodyContent: string[] = [];
	bodyContent.push(formatHeading("Details", 2));

	const metadata: string[] = [];
	metadata.push(`{bold}Created:{/bold} ${formatDateForDisplay(task.createdDate)}`);
	if (task.updatedDate && task.updatedDate !== task.createdDate) {
		metadata.push(`{bold}Updated:{/bold} ${formatDateForDisplay(task.updatedDate)}`);
	}
	if (task.dueDate) {
		const colorTag = isPastDueDate ? "{red-fg}" : "";
		metadata.push(`{bold}Due:{/bold} ${colorTag}${formatDateForDisplay(task.dueDate)}{/}`);
	}
	if (task.deferDate) {
		metadata.push(`{bold}Defer:{/bold} ${formatDateForDisplay(task.deferDate)}`);
	}
	if (task.completedDate) {
		metadata.push(`{bold}Completed:{/bold} ${formatDateForDisplay(task.completedDate)}`);
	}
	if (task.archivedDate) {
		metadata.push(`{bold}Archived:{/bold} ${formatDateForDisplay(task.archivedDate)}`);
	}
	if (task.priority) {
		const priorityDisplay = getPriorityDisplay(task.priority);
		const priorityText = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
		metadata.push(`{bold}Priority:{/bold} ${priorityText}${priorityDisplay}`);
	}
	if (task.assignee?.length) {
		const assigneeList = task.assignee.map((a) => (a.startsWith("@") ? a : `@${a}`)).join(", ");
		metadata.push(`{bold}Assignee:{/bold} {cyan-fg}${assigneeList}{/}`);
	}
	if (task.labels?.length) {
		metadata.push(`{bold}Labels:{/bold} ${task.labels.map((l) => `{yellow-fg}[${l}]{/}`).join(" ")}`);
	}
	if (task.reporter) {
		const reporterText = task.reporter.startsWith("@") ? task.reporter : `@${task.reporter}`;
		metadata.push(`{bold}Reporter:{/bold} {cyan-fg}${reporterText}{/}`);
	}
	if (task.milestone) {
		const milestoneLabel = resolveMilestoneLabel ? resolveMilestoneLabel(task.milestone) : task.milestone;
		metadata.push(`{bold}Milestone:{/bold} {magenta-fg}${milestoneLabel}{/}`);
	}
	if (task.parentTaskId) {
		const parentLabel = task.parentTaskTitle ? `${task.parentTaskId} - ${task.parentTaskTitle}` : task.parentTaskId;
		metadata.push(`{bold}Parent:{/bold} {blue-fg}${parentLabel}{/}`);
	}
	if (task.subtasks?.length) {
		metadata.push(`{bold}Subtasks:{/bold} ${task.subtasks.length} task${task.subtasks.length > 1 ? "s" : ""}`);
	}
	if (task.dependencies?.length) {
		metadata.push(`{bold}Dependencies:{/bold} ${task.dependencies.join(", ")}`);
	}
	if (task.modifiedFiles?.length) {
		metadata.push(`{bold}Modified files:{/bold} ${task.modifiedFiles.join(", ")}`);
	}

	bodyContent.push(metadata.join("\n"));
	bodyContent.push("");

	bodyContent.push(formatHeading("Description", 2));
	const descriptionText = task.description?.trim();
	const descriptionContent = descriptionText
		? transformCodePaths(descriptionText)
		: "{gray-fg}No description provided{/}";
	bodyContent.push(descriptionContent);
	bodyContent.push("");

	if (task.references?.length) {
		bodyContent.push(formatHeading("References", 2));
		const formattedRefs = task.references.map((ref) => {
			if (ref.startsWith("http://") || ref.startsWith("https://")) {
				return `  {cyan-fg}${ref}{/}`;
			}
			return `  {yellow-fg}${ref}{/}`;
		});
		bodyContent.push(formattedRefs.join("\n"));
		bodyContent.push("");
	}

	if (task.documentation?.length) {
		bodyContent.push(formatHeading("Documentation", 2));
		const formattedDocs = task.documentation.map((doc) => {
			if (doc.startsWith("http://") || doc.startsWith("https://")) {
				return `  {cyan-fg}${doc}{/}`;
			}
			return `  {yellow-fg}${doc}{/}`;
		});
		bodyContent.push(formattedDocs.join("\n"));
		bodyContent.push("");
	}

	bodyContent.push(formatHeading("Acceptance Criteria", 2));
	const checklistItems = buildAcceptanceCriteriaItems(task);
	if (checklistItems.length > 0) {
		const formattedCriteria = checklistItems.map((item) =>
			formatChecklistItem(
				{
					text: transformCodePaths(item.text),
					checked: item.checked,
				},
				{
					padding: " ",
					checkedSymbol: "{green-fg}✓{/}",
					uncheckedSymbol: "{gray-fg}○{/}",
				},
			),
		);
		bodyContent.push(formattedCriteria.join("\n"));
	} else {
		bodyContent.push("{gray-fg}No acceptance criteria defined{/}");
	}
	bodyContent.push("");

	bodyContent.push(formatHeading("Definition of Done", 2));
	const definitionItems = buildDefinitionOfDoneItems(task);
	if (definitionItems.length > 0) {
		const formattedDefinition = definitionItems.map((item) =>
			formatChecklistItem(
				{
					text: transformCodePaths(item.text),
					checked: item.checked,
				},
				{
					padding: " ",
					checkedSymbol: "{green-fg}✓{/}",
					uncheckedSymbol: "{gray-fg}○{/}",
				},
			),
		);
		bodyContent.push(formattedDefinition.join("\n"));
	} else {
		bodyContent.push("{gray-fg}No Definition of Done items defined{/}");
	}
	bodyContent.push("");

	const implementationPlan = task.implementationPlan?.trim();
	if (implementationPlan) {
		bodyContent.push(formatHeading("Implementation Plan", 2));
		bodyContent.push(transformCodePaths(implementationPlan));
		bodyContent.push("");
	}

	const implementationNotes = task.implementationNotes?.trim();
	if (implementationNotes) {
		bodyContent.push(formatHeading("Implementation Notes", 2));
		bodyContent.push(transformCodePaths(implementationNotes));
		bodyContent.push("");
	}

	const finalSummary = task.finalSummary?.trim();
	if (finalSummary) {
		bodyContent.push(formatHeading("Final Summary", 2));
		bodyContent.push(transformCodePaths(finalSummary));
		bodyContent.push("");
	}

	return { headerContent, bodyContent };
}

export function getPriorityDisplay(priority?: "high" | "medium" | "low"): string {
	switch (priority) {
		case "high":
			return " {red-fg}●{/}";
		case "medium":
			return " {yellow-fg}●{/}";
		case "low":
			return " {green-fg}●{/}";
		default:
			return "";
	}
}

export function createMilestoneLabelResolver(milestones: Milestone[]): (milestone: string) => string {
	const milestoneLabelsByKey = new Map<string, string>();
	for (const milestone of milestones) {
		const normalizedId = milestone.id.trim();
		const normalizedTitle = milestone.title.trim();
		if (!normalizedId || !normalizedTitle) continue;
		milestoneLabelsByKey.set(normalizedId.toLowerCase(), normalizedTitle);
		const idMatch = normalizedId.match(/^m-(\d+)$/i);
		if (idMatch?.[1]) {
			const numericAlias = String(Number.parseInt(idMatch[1], 10));
			milestoneLabelsByKey.set(`m-${numericAlias}`, normalizedTitle);
			milestoneLabelsByKey.set(numericAlias, normalizedTitle);
		}
		milestoneLabelsByKey.set(normalizedTitle.toLowerCase(), normalizedTitle);
	}

	return (milestone: string) => {
		const normalized = milestone.trim();
		if (!normalized) return milestone;
		return milestoneLabelsByKey.get(normalized.toLowerCase()) ?? milestone;
	};
}

export function computeHeaderLineCount(headerLines: string[], terminalWidth: number): number {
	let headerLineCount = 0;
	for (const headerLine of headerLines) {
		const plainText = headerLine.replace(/\{[^}]+\}/g, "");
		const lineCount = Math.max(1, Math.ceil(plainText.length / terminalWidth));
		headerLineCount += lineCount;
	}
	return headerLineCount;
}
