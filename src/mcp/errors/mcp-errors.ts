import { AppError } from "../../utils/app-error.ts";
import { getLogger } from "../../utils/logger.ts";
import type { CallToolResult } from "../types.ts";

export { AppError };

export function handleBacklogToolError(error: unknown): CallToolResult {
	if (error instanceof AppError) {
		return error.formatForMCP();
	}

	getLogger().error("Unexpected MCP error:", error instanceof Error ? error.message : String(error));

	return {
		content: [
			{
				type: "text",
				text: formatErrorMarkdown("INTERNAL_ERROR", "An unexpected error occurred", error, !!process.env.DEBUG),
			},
		],
		isError: true,
		structuredContent: {
			code: "INTERNAL_ERROR",
			details: error,
		},
	};
}

/**
 * Format error messages in markdown for consistent MCP error responses
 */
function formatErrorMarkdown(code: string, message: string, details?: unknown, includeDetails = false): string {
	if (includeDetails && details) {
		let result = `${code}: ${message}`;

		const detailsText = typeof details === "string" ? details : JSON.stringify(details, null, 2);
		result += `\n  ${detailsText}`;

		return result;
	}

	return message;
}
