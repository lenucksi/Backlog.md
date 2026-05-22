import type { JsonSchema } from "../../validation/validators.ts";

export const statisticsSchema: JsonSchema = {
	type: "object",
	properties: {
		milestone: {
			type: "string",
			maxLength: 100,
		},
	},
	required: [],
	additionalProperties: false,
};
