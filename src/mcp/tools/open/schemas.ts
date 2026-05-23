import type { JsonSchema } from "../../validation/validators.ts";

export const openInBrowserSchema: JsonSchema = {
	type: "object",
	properties: {
		id: { type: "string", minLength: 1, maxLength: 100 },
		port: { type: "number", minimum: 1, maximum: 65535 },
	},
	required: ["id"],
	additionalProperties: false,
};
