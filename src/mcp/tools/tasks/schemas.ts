import type { JsonSchema } from "../../validation/validators.ts";

export const taskListSchema: JsonSchema = {
	type: "object",
	properties: {
		status: {
			type: "string",
			maxLength: 100,
		},
		assignee: {
			type: "string",
			maxLength: 100,
		},
		milestone: {
			type: "string",
			maxLength: 100,
		},
		labels: {
			type: "array",
			items: { type: "string", maxLength: 50 },
		},
		search: {
			type: "string",
			maxLength: 200,
		},
		limit: {
			type: "number",
			minimum: 1,
			maximum: 1000,
		},
	},
	required: [],
	additionalProperties: false,
};

export const taskSearchSchema: JsonSchema = {
	type: "object",
	properties: {
		query: {
			type: "string",
			maxLength: 200,
		},
		status: {
			type: "string",
			maxLength: 100,
		},
		priority: {
			type: "string",
			enum: ["high", "medium", "low"],
		},
		modifiedFiles: {
			type: "array",
			items: { type: "string", maxLength: 500 },
			description: "Filter tasks by case-insensitive substring match against modified file paths",
		},
		limit: {
			type: "number",
			minimum: 1,
			maximum: 100,
		},
	},
	required: [],
	additionalProperties: false,
};

export const taskViewSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 50,
		},
	},
	required: ["id"],
	additionalProperties: false,
};

export const taskArchiveSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 50,
		},
	},
	required: ["id"],
	additionalProperties: false,
};

export const taskCompleteSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 50,
		},
	},
	required: ["id"],
	additionalProperties: false,
};

export const taskReorderSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 50,
		},
		after: {
			type: "string",
			maxLength: 50,
			description: "Place task after this task ID",
		},
		before: {
			type: "string",
			maxLength: 50,
			description: "Place task before this task ID",
		},
		ordinal: {
			type: "number",
			minimum: 0,
			description: "Set task ordinal directly",
		},
		status: {
			type: "string",
			maxLength: 100,
			description: "Target status for the task after reorder",
		},
	},
	required: ["id"],
	additionalProperties: false,
};

export const taskDemoteSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 50,
		},
	},
	required: ["id"],
	additionalProperties: false,
};
