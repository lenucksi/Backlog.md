import { DEFAULT_STATUSES } from "../../constants/index.ts";
import type { BacklogConfig } from "../../types/index.ts";
import type { JsonSchema } from "../validation/validators.ts";

const descriptionField = { type: "string", maxLength: 10000 } satisfies JsonSchema;
const priorityField = { type: "string", enum: ["high", "medium", "low"] } satisfies JsonSchema;

function stringArrayField(maxLength: number): JsonSchema {
	return { type: "array", items: { type: "string", maxLength } };
}

/** Shared property blocks used in both create and edit task schemas. */
const REFERENCE_ITEMS = { type: "string", maxLength: 500 } as const;
const ACCEPTANCE_CRITERIA_ITEMS = { type: "string", maxLength: 500 } as const;
const FINAL_SUMMARY_FIELD = {
	type: "string",
	maxLength: 20000,
	description: "Final summary for PR-style completion notes. Write this only when the task is complete.",
} as const satisfies JsonSchema;
const DEFINITION_OF_DONE_ADD_FIELD = {
	type: "array",
	items: { type: "string", maxLength: 500 },
	description:
		"Task-specific Definition of Done items to append for this task only. Do not copy project defaults here.",
} as const satisfies JsonSchema;

/**
 * Generates a status field schema with dynamic enum values sourced from config.
 */
function generateStatusFieldSchema(config: BacklogConfig): JsonSchema {
	const configuredStatuses =
		config.statuses && config.statuses.length > 0 ? [...config.statuses] : [...DEFAULT_STATUSES];
	const normalizedStatuses = configuredStatuses.map((status) => status.trim());
	const hasDraft = normalizedStatuses.some((status) => status.toLowerCase() === "draft");
	const enumStatuses = hasDraft ? normalizedStatuses : ["Draft", ...normalizedStatuses];
	const defaultStatus = normalizedStatuses[0] ?? DEFAULT_STATUSES[0];

	return {
		type: "string",
		maxLength: 100,
		enum: enumStatuses,
		enumCaseInsensitive: true,
		enumNormalizeWhitespace: true,
		default: defaultStatus,
		description: `Status value (case-insensitive). Valid values: ${enumStatuses.join(", ")}`,
	};
}

function baseTaskProperties(config: BacklogConfig, titleMinLength?: number): Record<string, JsonSchema> {
	const titleSchema: JsonSchema = titleMinLength
		? { type: "string", minLength: titleMinLength, maxLength: 200 }
		: { type: "string", maxLength: 200 };
	return {
		title: titleSchema,
		description: descriptionField,
		status: generateStatusFieldSchema(config),
		priority: priorityField,
		ordinal: {
			type: "number",
			minimum: 0,
			description:
				"Optional non-negative ordering value for manual task ordering. Lower values sort earlier. Prefer spaced integers such as 1000, 2000, 3000 to leave room for inserts.",
		},
		milestone: { type: "string", minLength: 1, maxLength: 100, description: "Optional milestone label (trimmed)." },
		labels: stringArrayField(50),
		assignee: stringArrayField(100),
		dependencies: stringArrayField(50),
		references: {
			type: "array",
			items: REFERENCE_ITEMS,
			description: "Reference URLs or file paths related to this task",
		},
		documentation: {
			type: "array",
			items: REFERENCE_ITEMS,
			description: "Documentation URLs or file paths for understanding this task",
		},
		modifiedFiles: {
			type: "array",
			items: REFERENCE_ITEMS,
			description: "Project-root-relative file paths modified by this task",
		},
		finalSummary: FINAL_SUMMARY_FIELD,
		definitionOfDoneAdd: DEFINITION_OF_DONE_ADD_FIELD,
		dueDate: { type: "string", maxLength: 100, description: "Due date for the task (YYYY-MM-DD or YYYY-MM-DD HH:mm)" },
		deferDate: {
			type: "string",
			maxLength: 100,
			description: "Defer/show after date (YYYY-MM-DD or YYYY-MM-DD HH:mm)",
		},
	};
}

/**
 * Generates the task_create input schema with dynamic status enum
 */
// aislop-ignore-line knip/exports -- used at runtime, not statically detectable
export function generateTaskCreateSchema(config: BacklogConfig): JsonSchema {
	return {
		type: "object",
		properties: {
			...baseTaskProperties(config),
			acceptanceCriteria: { type: "array", items: ACCEPTANCE_CRITERIA_ITEMS },
			disableDefinitionOfDoneDefaults: {
				type: "boolean",
				description:
					"Disable project-level Definition of Done defaults for this task creation. Use definition_of_done_defaults_upsert to change project defaults.",
			},
			parentTaskId: { type: "string", maxLength: 50 },
		},
		required: ["title"],
		additionalProperties: false,
	};
}

/** Fields shared by create and edit schemas, with edit-specific description overrides. */
const editOrdinalField: JsonSchema = {
	type: "number",
	minimum: 0,
	description:
		"Set task ordinal for manual ordering. Lower values sort earlier. Prefer spaced integers such as 1000, 2000, 3000 to leave room for inserts.",
};
const editMilestoneField: JsonSchema = {
	type: "string",
	minLength: 1,
	maxLength: 100,
	description: "Set milestone label (string) or clear it (null).",
};
const editRefDesc = "Set reference URLs or file paths (replaces existing)";
const editDocDesc = "Set documentation URLs or file paths (replaces existing)";
const editFilesDesc = "Set project-root-relative modified file paths (replaces existing)";
const editDueDateDesc = "Due date for the task (YYYY-MM-DD or YYYY-MM-DD HH:mm). Pass null to clear.";
const editDeferDateDesc = "Defer/show after date (YYYY-MM-DD or YYYY-MM-DD HH:mm). Pass null to clear.";

/**
 * Generates the task_edit input schema with dynamic status enum and MCP-specific operations.
 // aislop-ignore-line knip/exports -- used at runtime, not statically detectable
 */
export function generateTaskEditSchema(config: BacklogConfig): JsonSchema {
	return {
		type: "object",
		properties: {
			id: { type: "string", minLength: 1, maxLength: 50 },
			title: { type: "string", maxLength: 200 },
			description: descriptionField,
			status: generateStatusFieldSchema(config),
			priority: priorityField,
			ordinal: editOrdinalField,
			milestone: editMilestoneField,
			labels: stringArrayField(50),
			assignee: stringArrayField(100),
			dependencies: stringArrayField(50),
			references: { type: "array", items: REFERENCE_ITEMS, description: editRefDesc },
			addReferences: { type: "array", items: REFERENCE_ITEMS, description: "Add reference URLs or file paths" },
			removeReferences: { type: "array", items: REFERENCE_ITEMS, description: "Remove reference URLs or file paths" },
			documentation: { type: "array", items: REFERENCE_ITEMS, description: editDocDesc },
			addDocumentation: { type: "array", items: REFERENCE_ITEMS, description: "Add documentation URLs or file paths" },
			removeDocumentation: {
				type: "array",
				items: REFERENCE_ITEMS,
				description: "Remove documentation URLs or file paths",
			},
			modifiedFiles: { type: "array", items: REFERENCE_ITEMS, description: editFilesDesc },
			implementationNotes: { type: "string", maxLength: 10000 },
			finalSummary: FINAL_SUMMARY_FIELD,
			finalSummaryAppend: { type: "array", items: { type: "string", maxLength: 5000 }, maxItems: 20 },
			finalSummaryClear: { type: "boolean" },
			notesSet: { type: "string", maxLength: 20000 },
			notesAppend: { type: "array", items: { type: "string", maxLength: 5000 }, maxItems: 20 },
			notesClear: { type: "boolean" },
			planSet: { type: "string", maxLength: 20000 },
			planAppend: { type: "array", items: { type: "string", maxLength: 5000 }, maxItems: 20 },
			planClear: { type: "boolean" },
			acceptanceCriteriaSet: { type: "array", items: ACCEPTANCE_CRITERIA_ITEMS, maxItems: 50 },
			acceptanceCriteriaAdd: { type: "array", items: ACCEPTANCE_CRITERIA_ITEMS, maxItems: 50 },
			acceptanceCriteriaRemove: { type: "array", items: { type: "number", minimum: 1 }, maxItems: 50 },
			acceptanceCriteriaCheck: { type: "array", items: { type: "number", minimum: 1 }, maxItems: 50 },
			acceptanceCriteriaUncheck: { type: "array", items: { type: "number", minimum: 1 }, maxItems: 50 },
			definitionOfDoneAdd: { ...DEFINITION_OF_DONE_ADD_FIELD, maxItems: 50 },
			definitionOfDoneRemove: {
				type: "array",
				items: { type: "number", minimum: 1 },
				maxItems: 50,
				description: "Remove task-specific Definition of Done items by 1-based index on this task.",
			},
			definitionOfDoneCheck: {
				type: "array",
				items: { type: "number", minimum: 1 },
				maxItems: 50,
				description: "Mark task-specific Definition of Done items as complete by 1-based index on this task.",
			},
			definitionOfDoneUncheck: {
				type: "array",
				items: { type: "number", minimum: 1 },
				maxItems: 50,
				description: "Mark task-specific Definition of Done items as incomplete by 1-based index on this task.",
			},
			dueDate: { type: "string", maxLength: 100, description: editDueDateDesc },
			deferDate: { type: "string", maxLength: 100, description: editDeferDateDesc },
		},
		required: ["id"],
		additionalProperties: false,
	};
}
