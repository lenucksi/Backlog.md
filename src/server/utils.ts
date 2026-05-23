import type { Document, SearchFilters, SearchPriorityFilter, Task, TaskUpdateInput } from "../types/index.ts";

const PREFIX_PATTERN = /^[a-zA-Z]+-/i;
const DEFAULT_PREFIX = "task-";
const DOCUMENT_TYPES = new Set<Document["type"]>(["readme", "guide", "specification", "other"]);

export class DocumentPayloadValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DocumentPayloadValidationError";
	}
}

export function parseDocumentType(value: unknown): Document["type"] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "string") {
		throw new DocumentPayloadValidationError("Document type must be a string.");
	}
	if (!DOCUMENT_TYPES.has(value as Document["type"])) {
		throw new DocumentPayloadValidationError("Document type must be one of: readme, guide, specification, other.");
	}
	return value as Document["type"];
}

export function parseDocumentLabels(value: unknown): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!Array.isArray(value)) {
		throw new DocumentPayloadValidationError("Document labels must be an array of strings.");
	}
	if (value.some((label) => typeof label !== "string")) {
		throw new DocumentPayloadValidationError("Document labels must be an array of strings.");
	}
	return Array.from(new Set(value.map((label) => label.trim()).filter((label) => label.length > 0)));
}

export function parseDocumentTags(value: unknown): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!Array.isArray(value)) {
		throw new DocumentPayloadValidationError("Document tags must be an array of strings.");
	}
	if (value.some((tag) => typeof tag !== "string")) {
		throw new DocumentPayloadValidationError("Document tags must be an array of strings.");
	}
	return Array.from(new Set(value.map((tag) => tag.trim()).filter((tag) => tag.length > 0)));
}

export function parseCreateDocumentPath(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "string") {
		throw new DocumentPayloadValidationError("Document path must be a string.");
	}
	return value;
}

export function parseUpdateDocumentPath(value: unknown): string | null | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (value === null || typeof value === "string") {
		return value;
	}
	throw new DocumentPayloadValidationError("Document path must be a string or null.");
}

export function isDocumentValidationError(error: Error): boolean {
	return (
		error instanceof DocumentPayloadValidationError ||
		error.message.startsWith("Document type ") ||
		error.message.startsWith("Document path ") ||
		error.message === "Title is required to create a document." ||
		error.message === "Document title cannot be empty."
	);
}

export function handleDocumentUpdateError(error: unknown): Response {
	if (error instanceof SyntaxError) {
		return Response.json({ error: "Invalid request payload" }, { status: 400 });
	}
	if (error instanceof Error) {
		if (error.message.startsWith("Document not found")) {
			return Response.json({ error: error.message }, { status: 404 });
		}
		if (isDocumentValidationError(error)) {
			return Response.json({ error: error.message }, { status: 400 });
		}
	}
	console.error("Error updating document:", error);
	return Response.json({ error: "Failed to update document" }, { status: 500 });
}

export function stripPrefix(id: string): string {
	return id.replace(PREFIX_PATTERN, "");
}

export function ensurePrefix(id: string): string {
	if (PREFIX_PATTERN.test(id)) {
		return id;
	}
	return `${DEFAULT_PREFIX}${id}`;
}

export function parseTaskIdSegments(value: string): number[] | null {
	const withoutPrefix = stripPrefix(value);
	if (!/^[0-9]+(?:\.[0-9]+)*$/.test(withoutPrefix)) {
		return null;
	}
	return withoutPrefix.split(".").map((segment) => Number.parseInt(segment, 10));
}

export function findTaskByLooseId(tasks: Task[], inputId: string): Task | undefined {
	const lowerInputId = inputId.toLowerCase();
	const exact = tasks.find((task) => task.id.toLowerCase() === lowerInputId);
	if (exact) {
		return exact;
	}

	const inputSegments = parseTaskIdSegments(inputId);
	if (!inputSegments) {
		return undefined;
	}

	return tasks.find((task) => {
		const candidateSegments = parseTaskIdSegments(task.id);
		if (!candidateSegments || candidateSegments.length !== inputSegments.length) {
			return false;
		}
		for (let index = 0; index < candidateSegments.length; index += 1) {
			if (candidateSegments[index] !== inputSegments[index]) {
				return false;
			}
		}
		return true;
	});
}

export function parseOptionalBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
	}
	return undefined;
}

export function parseMultiParam(url: URL, ...keys: string[]): string[] {
	const searchParams = url.searchParams;
	const values: string[] = [];
	for (const key of keys) {
		values.push(...searchParams.getAll(key));
	}
	const lastKey = keys.at(-1);
	const csvValue = lastKey ? searchParams.get(lastKey) : null;
	if (csvValue) {
		values.push(...csvValue.split(","));
	}
	return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

export function buildSearchFilters(
	statusParams: string[],
	priorityParamsRaw: string[],
	assigneeParamsRaw: string[],
	labelParamsRaw: string[],
	modifiedFileParamsRaw: string[],
): { error?: Response; filters: SearchFilters } {
	const filters: SearchFilters = {};

	if (statusParams.length === 1) {
		filters.status = statusParams[0];
	} else if (statusParams.length > 1) {
		filters.status = statusParams;
	}

	if (priorityParamsRaw.length > 0) {
		const allowedPriorities: SearchPriorityFilter[] = ["high", "medium", "low"];
		const normalizedPriorities = priorityParamsRaw.map((value) => value.toLowerCase());
		const invalidPriority = normalizedPriorities.find(
			(value) => !allowedPriorities.includes(value as SearchPriorityFilter),
		);
		if (invalidPriority) {
			return {
				error: Response.json(
					{ error: `Unsupported priority '${invalidPriority}'. Use high, medium, or low.` },
					{ status: 400 },
				),
				filters,
			};
		}
		const casted = normalizedPriorities as SearchPriorityFilter[];
		filters.priority = casted.length === 1 ? casted[0] : casted;
	}

	if (assigneeParamsRaw.length > 0) {
		const normalizedAssignees = assigneeParamsRaw.map((value) => value.trim()).filter((value) => value.length > 0);
		if (normalizedAssignees.length > 0) {
			filters.assignee = normalizedAssignees.length === 1 ? normalizedAssignees[0] : normalizedAssignees;
		}
	}

	if (labelParamsRaw.length > 0) {
		const normalizedLabels = labelParamsRaw.map((value) => value.trim()).filter((value) => value.length > 0);
		if (normalizedLabels.length > 0) {
			filters.labels = normalizedLabels.length === 1 ? normalizedLabels[0] : normalizedLabels;
		}
	}

	if (modifiedFileParamsRaw.length > 0) {
		const normalizedModifiedFiles = modifiedFileParamsRaw
			.map((value) => value.trim())
			.filter((value) => value.length > 0);
		if (normalizedModifiedFiles.length > 0) {
			filters.modifiedFiles =
				normalizedModifiedFiles.length === 1 ? normalizedModifiedFiles[0] : normalizedModifiedFiles;
		}
	}

	return { filters };
}

export function buildTaskUpdateInputFromBody(updates: Record<string, unknown>): TaskUpdateInput {
	const updateInput: TaskUpdateInput = {};

	if ("title" in updates && typeof updates.title === "string") {
		updateInput.title = updates.title;
	}

	if ("description" in updates && typeof updates.description === "string") {
		updateInput.description = updates.description;
	}

	if ("status" in updates && typeof updates.status === "string") {
		updateInput.status = updates.status;
	}

	if ("priority" in updates && typeof updates.priority === "string") {
		updateInput.priority = updates.priority as "high" | "medium" | "low";
	}

	if ("labels" in updates && Array.isArray(updates.labels)) {
		updateInput.labels = updates.labels as string[];
	}

	if ("assignee" in updates && Array.isArray(updates.assignee)) {
		updateInput.assignee = updates.assignee as string[];
	}

	if ("dependencies" in updates && Array.isArray(updates.dependencies)) {
		updateInput.dependencies = updates.dependencies;
	}

	if ("references" in updates && Array.isArray(updates.references)) {
		updateInput.references = updates.references;
	}

	if ("modifiedFiles" in updates && Array.isArray(updates.modifiedFiles)) {
		updateInput.modifiedFiles = updates.modifiedFiles;
	}

	if ("implementationPlan" in updates && typeof updates.implementationPlan === "string") {
		updateInput.implementationPlan = updates.implementationPlan;
	}

	if ("implementationNotes" in updates && typeof updates.implementationNotes === "string") {
		updateInput.implementationNotes = updates.implementationNotes;
	}

	if ("finalSummary" in updates && typeof updates.finalSummary === "string") {
		updateInput.finalSummary = updates.finalSummary;
	}

	if ("acceptanceCriteriaItems" in updates && Array.isArray(updates.acceptanceCriteriaItems)) {
		updateInput.acceptanceCriteria = updates.acceptanceCriteriaItems
			.map((item: unknown) => ({
				text: String((item as Record<string, unknown>)?.text ?? "").trim(),
				checked: Boolean((item as Record<string, unknown>)?.checked),
			}))
			.filter((item: { text: string }) => item.text.length > 0);
	}

	if ("definitionOfDoneAdd" in updates && Array.isArray(updates.definitionOfDoneAdd)) {
		updateInput.addDefinitionOfDone = updates.definitionOfDoneAdd
			.map((item: unknown) => ({ text: String(item ?? "").trim(), checked: false }))
			.filter((item: { text: string }) => item.text.length > 0);
	}

	if ("definitionOfDoneRemove" in updates && Array.isArray(updates.definitionOfDoneRemove)) {
		updateInput.removeDefinitionOfDone = updates.definitionOfDoneRemove.filter(
			(value: unknown) => typeof value === "number" && Number.isFinite(value),
		);
	}

	if ("definitionOfDoneCheck" in updates && Array.isArray(updates.definitionOfDoneCheck)) {
		updateInput.checkDefinitionOfDone = updates.definitionOfDoneCheck.filter(
			(value: unknown) => typeof value === "number" && Number.isFinite(value),
		);
	}

	if ("definitionOfDoneUncheck" in updates && Array.isArray(updates.definitionOfDoneUncheck)) {
		updateInput.uncheckDefinitionOfDone = updates.definitionOfDoneUncheck.filter(
			(value: unknown) => typeof value === "number" && Number.isFinite(value),
		);
	}

	return updateInput;
}
