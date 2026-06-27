import type { JsonSchema } from "../../validation/validators.ts";

export const authorListSchema: JsonSchema = {
	type: "object",
	properties: {},
	required: [],
	additionalProperties: false,
};

export const authorAddSchema: JsonSchema = {
	type: "object",
	properties: {
		name: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "Author name to add",
		},
		color: {
			type: "string",
			maxLength: 100,
			description: "Optional hex color for the author (e.g. #ff0000)",
		},
	},
	required: ["name"],
	additionalProperties: false,
};

export const authorRenameSchema: JsonSchema = {
	type: "object",
	properties: {
		oldName: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "Current author name",
		},
		newName: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "New author name",
		},
	},
	required: ["oldName", "newName"],
	additionalProperties: false,
};

export const authorRemoveSchema: JsonSchema = {
	type: "object",
	properties: {
		name: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "Author name to remove from config",
		},
	},
	required: ["name"],
	additionalProperties: false,
};
