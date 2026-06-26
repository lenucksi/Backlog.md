import type { AcceptanceCriterion, Decision, Document, Task } from "../types/index.ts";
import { normalizeAssignee } from "../utils/assignee.ts";
import { stringifyFrontmatter } from "../utils/frontmatter.ts";
import type { StructuredSectionValues } from "./structured-sections.ts";
import {
	AcceptanceCriteriaManager,
	DefinitionOfDoneManager,
	getStructuredSections,
	updateStructuredSections,
} from "./structured-sections.ts";

function normalizeOptionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function sectionChanged(rawContent: string, key: keyof StructuredSectionValues, nextValue: string): boolean {
	const existing = normalizeOptionalText(getStructuredSections(rawContent)[key]);
	return existing !== normalizeOptionalText(nextValue);
}

function checklistItemsEqual(left: AcceptanceCriterion[], right: AcceptanceCriterion[]): boolean {
	if (left.length !== right.length) return false;
	return left.every((item, index) => {
		const other = right[index];
		return other?.index === item.index && other.checked === item.checked && other.text === item.text;
	});
}

function updateSection(content: string, overrides: Partial<StructuredSectionValues>): string {
	const sections = getStructuredSections(content);
	return updateStructuredSections(content, {
		description: sections.description ?? "",
		implementationPlan: sections.implementationPlan ?? "",
		implementationNotes: sections.implementationNotes ?? "",
		finalSummary: sections.finalSummary ?? "",
		...overrides,
	});
}

function applyStringSection(
	content: string,
	rawContent: string,
	key: keyof StructuredSectionValues,
	value: string | undefined,
	updater: (body: string, value: string) => string,
): string {
	if (typeof value !== "string") return content;
	if (!sectionChanged(rawContent, key, value)) return content;
	return updater(content, value);
}

export function serializeTask(task: Task): string {
	normalizeAssignee(task);
	const frontmatter = {
		id: task.id,
		title: task.title,
		status: task.status,
		assignee: task.assignee,
		...(task.reporter && { reporter: task.reporter }),
		created_date: task.createdDate,
		...(task.updatedDate && { updated_date: task.updatedDate }),
		...(task.dueDate && { due_date: task.dueDate }),
		...(task.deferDate && { defer_date: task.deferDate }),
		...(task.completedDate && { completed_date: task.completedDate }),
		...(task.archivedDate && { archived_date: task.archivedDate }),
		labels: task.labels,
		...(task.milestone && { milestone: task.milestone }),
		dependencies: task.dependencies,
		...(task.references && task.references.length > 0 && { references: task.references }),
		...(task.documentation && task.documentation.length > 0 && { documentation: task.documentation }),
		...(task.modifiedFiles && task.modifiedFiles.length > 0 && { modified_files: task.modifiedFiles }),
		...(task.parentTaskId && { parent_task_id: task.parentTaskId }),
		...(task.subtasks && task.subtasks.length > 0 && { subtasks: task.subtasks }),
		...(task.priority && { priority: task.priority }),
		...(task.ordinal !== undefined && { ordinal: task.ordinal }),
		...(task.onStatusChange && { onStatusChange: task.onStatusChange }),
	};

	let contentBody = task.rawContent ?? "";
	const rawContent = task.rawContent ?? "";
	if (
		typeof task.description === "string" &&
		task.description.trim() !== "" &&
		sectionChanged(rawContent, "description", task.description)
	) {
		contentBody = updateTaskDescription(contentBody, task.description);
	}
	if (Array.isArray(task.acceptanceCriteriaItems)) {
		const existingCriteria = AcceptanceCriteriaManager.parseAllCriteria(task.rawContent ?? "");
		const hasExistingStructuredCriteria = existingCriteria.length > 0;
		if (
			(task.acceptanceCriteriaItems.length > 0 || hasExistingStructuredCriteria) &&
			!checklistItemsEqual(existingCriteria, task.acceptanceCriteriaItems)
		) {
			contentBody = AcceptanceCriteriaManager.updateContent(contentBody, task.acceptanceCriteriaItems);
		}
	}
	if (Array.isArray(task.definitionOfDoneItems)) {
		const existingDefinitionOfDone = DefinitionOfDoneManager.parseAllCriteria(task.rawContent ?? "");
		const hasExistingDefinitionOfDone = existingDefinitionOfDone.length > 0;
		if (
			(task.definitionOfDoneItems.length > 0 || hasExistingDefinitionOfDone) &&
			!checklistItemsEqual(existingDefinitionOfDone, task.definitionOfDoneItems)
		) {
			contentBody = DefinitionOfDoneManager.updateContent(contentBody, task.definitionOfDoneItems);
		}
	}
	contentBody = applyStringSection(
		contentBody,
		rawContent,
		"implementationPlan",
		task.implementationPlan,
		updateTaskImplementationPlan,
	);
	contentBody = applyStringSection(
		contentBody,
		rawContent,
		"implementationNotes",
		task.implementationNotes,
		updateTaskImplementationNotes,
	);
	contentBody = applyStringSection(contentBody, rawContent, "finalSummary", task.finalSummary, updateTaskFinalSummary);

	const serialized = stringifyFrontmatter(contentBody, frontmatter);
	// Ensure there's a blank line between frontmatter and content
	return serialized.replace(/^(---\n(?:.*\n)*?---)\n(?!$)/, "$1\n\n");
}

export function serializeDecision(decision: Decision): string {
	const frontmatter: Record<string, unknown> = {
		id: decision.id,
		title: decision.title,
		date: decision.date,
		status: decision.status,
	};

	if (decision.labels && decision.labels.length > 0) {
		frontmatter.labels = decision.labels;
	}

	if (decision.supersedes) {
		frontmatter.supersedes = decision.supersedes;
	}
	if (decision.supersededBy) {
		frontmatter.supersededBy = decision.supersededBy;
	}

	let content = `## Context\n\n${decision.context}\n\n`;
	content += `## Decision\n\n${decision.decision}\n\n`;
	content += `## Consequences\n\n${decision.consequences}`;

	if (decision.alternatives) {
		content += `\n\n## Alternatives\n\n${decision.alternatives}`;
	}

	return stringifyFrontmatter(content, frontmatter);
}

export function serializeDocument(document: Document): string {
	const frontmatter = {
		id: document.id,
		title: document.title,
		type: document.type,
		created_date: document.createdDate,
		...(document.updatedDate && { updated_date: document.updatedDate }),
		...(document.labels && document.labels.length > 0 && { labels: document.labels }),
		...(document.tags && document.tags.length > 0 && { tags: document.tags }),
	};

	return stringifyFrontmatter(document.rawContent, frontmatter);
}

export function updateTaskAcceptanceCriteria(content: string, criteria: string[]): string {
	// Normalize to LF while computing, preserve original EOL at return
	const useCRLF = /\r\n/.test(content);
	const src = content.replace(/\r\n/g, "\n");
	// Find if there's already an Acceptance Criteria section
	const criteriaRegex = /## Acceptance Criteria\s*\n([\s\S]*?)(?=\n## |$)/i;
	const match = src.match(criteriaRegex);

	const newCriteria = criteria.map((criterion) => `- [ ] ${criterion}`).join("\n");
	const newSection = `## Acceptance Criteria\n\n${newCriteria}`;

	let out: string | undefined;
	if (match) {
		// Replace existing section
		out = src.replace(criteriaRegex, newSection);
	} else {
		// Add new section at the end
		out = `${src}\n\n${newSection}`;
	}
	return useCRLF ? out.replace(/\n/g, "\r\n") : out;
}

export function updateTaskImplementationPlan(content: string, plan: string): string {
	return updateSection(content, { implementationPlan: plan });
}

export function updateTaskImplementationNotes(content: string, notes: string): string {
	return updateSection(content, { implementationNotes: notes });
}

export function updateTaskFinalSummary(content: string, summary: string): string {
	return updateSection(content, { finalSummary: summary });
}

export function appendTaskImplementationNotes(content: string, notesChunks: string | string[]): string {
	const chunks = (Array.isArray(notesChunks) ? notesChunks : [notesChunks])
		.map((c) => String(c))
		.map((c) => c.replace(/\r\n/g, "\n"))
		.map((c) => c.trim())
		.filter(Boolean);

	const appendedBlock = chunks.join("\n\n");
	const existingNotes = getStructuredSections(content).implementationNotes?.trim();
	const combined = existingNotes ? `${existingNotes}\n\n${appendedBlock}` : appendedBlock;
	return updateSection(content, { implementationNotes: combined });
}

export function updateTaskDescription(content: string, description: string): string {
	return updateSection(content, { description });
}
