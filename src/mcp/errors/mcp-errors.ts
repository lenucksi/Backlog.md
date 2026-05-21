import { AppError } from "../../utils/app-error.ts";
import type { CallToolResult } from "../types.ts";

export { AppError };

export function handleBacklogToolError(error: unknown): CallToolResult {
	if (error instanceof AppError) {
		return error.formatForMCP();
	}

	console.error("Unexpected MCP error:", error);

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
 * Formats successful responses in a consistent structure
 */
export function handleMcpSuccess(data: unknown): CallToolResult {
	return {
		content: [
			{
				type: "text",
				text: "OK",
			},
		],
		structuredContent: {
			success: true,
			data,
		},
	};
}

/**
 * Format error messages in markdown for consistent MCP error responses
 */
export function formatErrorMarkdown(code: string, message: string, details?: unknown, includeDetails = false): string {
	if (includeDetails && details) {
		let result = `${code}: ${message}`;

		const detailsText = typeof details === "string" ? details : JSON.stringify(details, null, 2);
		result += `\n  ${detailsText}`;

		return result;
	}

	return message;
}
