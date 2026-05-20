import type { Task } from "../types/index.ts";
import type { ChecklistItem } from "../ui/checklist.ts";
import { transformCodePathsPlain } from "../ui/code-path.ts";
import { formatStatusWithIcon } from "../ui/status-icon.ts";
import { sortByTaskId } from "../utils/task-sorting.ts";

export type TaskPlainTextOptions = {
	filePathOverride?: string;
};

export function formatDateForDisplay(dateStr: string): string {
	if (!dateStr) return "";
	const hasTime = dateStr.includes(" ") || dateStr.includes("T");
	return hasTime ? dateStr : dateStr;
}

function buildChecklistItems(items: Task["acceptanceCriteriaItems"]): ChecklistItem[] {
	const criteria = items ?? [];
	return criteria
		.slice()
		.sort((a, b) => a.index - b.index)
		.map((criterion, index) => ({
			text: `#${index + 1} ${criterion.text}`,
			checked: criterion.checked,
		}));
}

export function buildAcceptanceCriteriaItems(task: Task): ChecklistItem[] {
	return buildChecklistItems(task.acceptanceCriteriaItems);
}

export function buildDefinitionOfDoneItems(task: Task): ChecklistItem[] {
	return buildChecklistItems(task.definitionOfDoneItems);
}

export function formatAcceptanceCriteriaLines(items: ChecklistItem[]): string[] {
	if (items.length === 0) return [];
	return items.map((item) => {
		const prefix = item.checked ? "- [x]" : "- [ ]";
		return `${prefix} ${transformCodePathsPlain(item.text)}`;
	});
}

function formatPriority(priority?: "high" | "medium" | "low"): string | null {
	if (!priority) return null;
	const label = priority.charAt(0).toUpperCase() + priority.slice(1);
	return label;
}

function formatAssignees(assignee?: string[]): string | null {
	if (!assignee || assignee.length === 0) return null;
	return assignee.map((a) => (a.startsWith("@") ? a : `@${a}`)).join(", ");
}

function formatSubtaskLines(subtasks: Array<{ id: string; title: string }>): string[] {
	if (subtasks.length === 0) return [];
	const sorted = sortByTaskId(subtasks);
	return sorted.map((subtask) => `- ${subtask.id} - ${subtask.title}`);
}

function formatFileSection(task: Task, options: TaskPlainTextOptions, lines: string[]): void {
	const filePath = options.filePathOverride ?? task.filePath;
	if (filePath) {
		lines.push(`File: ${filePath}`, "");
	}
}

function formatHeaderSection(task: Task, lines: string[]): void {
	lines.push(`Task ${task.id} - ${task.title}`);
	lines.push("=".repeat(50));
	lines.push("");
	lines.push(`Status: ${formatStatusWithIcon(task.status)}`);
	const priorityLabel = formatPriority(task.priority);
	if (priorityLabel) lines.push(`Priority: ${priorityLabel}`);
	if (task.ordinal !== undefined) lines.push(`Ordinal: ${task.ordinal}`);
}

function formatPeopleSection(task: Task, lines: string[]): void {
	const assigneeText = formatAssignees(task.assignee);
	if (assigneeText) lines.push(`Assignee: ${assigneeText}`);
	if (task.reporter) {
		const reporter = task.reporter.startsWith("@") ? task.reporter : `@${task.reporter}`;
		lines.push(`Reporter: ${reporter}`);
	}
}

function formatDateSection(task: Task, lines: string[]): void {
	lines.push(`Created: ${formatDateForDisplay(task.createdDate)}`);
	if (task.updatedDate) lines.push(`Updated: ${formatDateForDisplay(task.updatedDate)}`);
}

function formatMetadataSection(task: Task, lines: string[]): void {
	if (task.labels?.length) lines.push(`Labels: ${task.labels.join(", ")}`);
	if (task.milestone) lines.push(`Milestone: ${task.milestone}`);
}

function formatParentSection(task: Task, lines: string[]): void {
	if (task.parentTaskId) {
		const parentLabel = task.parentTaskTitle ? `${task.parentTaskId} - ${task.parentTaskTitle}` : task.parentTaskId;
		lines.push(`Parent: ${parentLabel}`);
	}
}

function formatSubtasksSection(task: Task, lines: string[]): void {
	const subtaskSummaries = task.subtaskSummaries ?? [];
	const subtaskCount = subtaskSummaries.length > 0 ? subtaskSummaries.length : (task.subtasks?.length ?? 0);
	if (subtaskCount > 0) {
		const subtaskLines = formatSubtaskLines(subtaskSummaries);
		if (subtaskLines.length > 0) {
			lines.push(`Subtasks (${subtaskCount}):`);
			lines.push(...subtaskLines);
		} else {
			lines.push(`Subtasks: ${subtaskCount}`);
		}
	}
}

function formatLinkSection(task: Task, lines: string[]): void {
	if (task.dependencies?.length) lines.push(`Dependencies: ${task.dependencies.join(", ")}`);
	if (task.references?.length) lines.push(`References: ${task.references.join(", ")}`);
	if (task.documentation?.length) lines.push(`Documentation: ${task.documentation.join(", ")}`);
	if (task.modifiedFiles?.length) lines.push(`Modified files: ${task.modifiedFiles.join(", ")}`);
}

function formatDescriptionSection(task: Task, lines: string[]): void {
	lines.push("");
	lines.push("Description:");
	lines.push("-".repeat(50));
	const description = task.description?.trim();
	lines.push(transformCodePathsPlain(description && description.length > 0 ? description : "No description provided"));
	lines.push("");
}

function formatChecklistSection(label: string, noItemsText: string, items: ChecklistItem[], lines: string[]): void {
	lines.push("");
	lines.push(`${label}:`);
	lines.push("-".repeat(50));
	if (items.length > 0) {
		lines.push(...formatAcceptanceCriteriaLines(items));
	} else {
		lines.push(noItemsText);
	}
	lines.push("");
}

function formatTextSection(label: string, content: string | undefined, lines: string[]): void {
	const trimmed = content?.trim();
	if (trimmed) {
		lines.push("");
		lines.push(`${label}:`);
		lines.push("-".repeat(50));
		lines.push(transformCodePathsPlain(trimmed));
		lines.push("");
	}
}

export function formatTaskPlainText(task: Task, options: TaskPlainTextOptions = {}): string {
	const lines: string[] = [];

	formatFileSection(task, options, lines);
	formatHeaderSection(task, lines);
	formatPeopleSection(task, lines);
	formatDateSection(task, lines);
	formatMetadataSection(task, lines);
	formatParentSection(task, lines);
	formatSubtasksSection(task, lines);
	formatLinkSection(task, lines);
	formatDescriptionSection(task, lines);
	formatChecklistSection(
		"Acceptance Criteria",
		"No acceptance criteria defined",
		buildAcceptanceCriteriaItems(task),
		lines,
	);
	formatChecklistSection(
		"Definition of Done",
		"No Definition of Done items defined",
		buildDefinitionOfDoneItems(task),
		lines,
	);
	formatTextSection("Implementation Plan", task.implementationPlan, lines);
	formatTextSection("Implementation Notes", task.implementationNotes, lines);
	formatTextSection("Final Summary", task.finalSummary, lines);

	return lines.join("\n");
}
