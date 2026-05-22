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
