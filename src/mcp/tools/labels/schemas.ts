import type { JsonSchema } from "../../validation/validators.ts";

export const labelListSchema: JsonSchema = {
	type: "object",
	properties: {},
	required: [],
	additionalProperties: false,
};

export const labelAddSchema: JsonSchema = {
	type: "object",
	properties: {
		name: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "Label name to add",
		},
		color: {
			type: "string",
			maxLength: 100,
			description: "Optional hex color for the label (e.g. #ff0000)",
		},
	},
	required: ["name"],
	additionalProperties: false,
};

export const labelRenameSchema: JsonSchema = {
	type: "object",
	properties: {
		oldName: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "Current label name",
		},
		newName: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "New label name",
		},
	},
	required: ["oldName", "newName"],
	additionalProperties: false,
};

export const labelRemoveSchema: JsonSchema = {
	type: "object",
	properties: {
		name: {
			type: "string",
			minLength: 1,
			maxLength: 100,
			description: "Label name to remove from config",
		},
	},
	required: ["name"],
	additionalProperties: false,
};
