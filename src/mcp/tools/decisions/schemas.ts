import type { JsonSchema } from "../../validation/validators.ts";

export const decisionListSchema: JsonSchema = {
	type: "object",
	properties: {
		search: {
			type: "string",
			maxLength: 200,
		},
		status: {
			type: "string",
			maxLength: 100,
		},
		supersedes: {
			type: "string",
			maxLength: 100,
		},
		supersededBy: {
			type: "string",
			maxLength: 100,
		},
		labels: {
			type: "array",
			items: { type: "string", maxLength: 100 },
			maxItems: 50,
		},
	},
	required: [],
	additionalProperties: false,
};

export const decisionViewSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 100,
		},
	},
	required: ["id"],
	additionalProperties: false,
};

export const decisionSupersedeSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 100,
		},
		title: {
			type: "string",
			minLength: 1,
			maxLength: 200,
		},
	},
	required: ["id", "title"],
	additionalProperties: false,
};

export const decisionCreateSchema: JsonSchema = {
	type: "object",
	properties: {
		title: {
			type: "string",
			minLength: 1,
			maxLength: 200,
		},
		status: {
			type: "string",
			maxLength: 100,
		},
		context: {
			type: "string",
			maxLength: 5000,
		},
		decision: {
			type: "string",
			maxLength: 5000,
		},
		consequences: {
			type: "string",
			maxLength: 5000,
		},
		alternatives: {
			type: "string",
			maxLength: 5000,
		},
		labels: {
			type: "array",
			items: { type: "string", maxLength: 100 },
			maxItems: 50,
		},
	},
	required: ["title"],
	additionalProperties: false,
};

export const decisionSearchSchema: JsonSchema = {
	type: "object",
	properties: {
		query: {
			type: "string",
			minLength: 1,
			maxLength: 200,
		},
		limit: {
			type: "number",
			minimum: 1,
			maximum: 100,
		},
		labels: {
			type: "array",
			items: { type: "string", maxLength: 100 },
			maxItems: 50,
		},
	},
	required: ["query"],
	additionalProperties: false,
};

export const decisionResolveSchema: JsonSchema = {
	type: "object",
	properties: {
		id: {
			type: "string",
			minLength: 1,
			maxLength: 100,
		},
		title: {
			type: "string",
			maxLength: 200,
		},
	},
	required: ["id"],
	additionalProperties: false,
};
