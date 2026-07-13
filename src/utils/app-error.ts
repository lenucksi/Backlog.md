import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getLogger } from "./logger.ts";

export const AppErrorCode = {
	NOT_FOUND: "NOT_FOUND",
	VALIDATION: "VALIDATION",
	CONFIG: "CONFIG",
	INTERNAL: "INTERNAL",
	NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

export type AppErrorCodeValue = (typeof AppErrorCode)[keyof typeof AppErrorCode];

export class AppError extends Error {
	constructor(
		message: string,
		public code: AppErrorCodeValue | string,
		public details?: unknown,
	) {
		super(message);
		this.name = "AppError";
	}

	static notFound(message: string): AppError {
		return new AppError(message, AppErrorCode.NOT_FOUND);
	}

	static validation(message: string, details?: unknown): AppError {
		return new AppError(message, AppErrorCode.VALIDATION, details);
	}

	static config(message: string, details?: unknown): AppError {
		return new AppError(message, AppErrorCode.CONFIG, details);
	}

	static internal(message = "An unexpected error occurred", details?: unknown): AppError {
		return new AppError(message, AppErrorCode.INTERNAL, details);
	}

	static notImplemented(message = "Not implemented", details?: unknown): AppError {
		return new AppError(message, AppErrorCode.NOT_IMPLEMENTED, details);
	}

	formatForCLI(): string {
		return this.message;
	}

	formatForMCP(): CallToolResult {
		const includeDetails = !!Bun.env.DEBUG;
		const structured = this.details !== undefined ? { code: this.code, details: this.details } : { code: this.code };
		return {
			content: [
				{
					type: "text",
					text: this.formatErrorMarkdown(includeDetails),
				},
			],
			isError: true,
			structuredContent: structured,
		};
	}

	formatForServer(): Response {
		const statusCode = this.getStatusCode();
		if (statusCode === 500) {
			getLogger().error(`${this.code}:`, this.message, this.details ?? "");
		}
		return Response.json({ error: this.message }, { status: statusCode });
	}

	private formatErrorMarkdown(includeDetails: boolean): string {
		if (includeDetails && this.details !== undefined) {
			const detailsText = typeof this.details === "string" ? this.details : JSON.stringify(this.details, null, 2);
			return `${this.code}: ${this.message}\n  ${detailsText}`;
		}
		return this.message;
	}

	static formatCLIError(error: unknown): string {
		if (error instanceof AppError) {
			return error.formatForCLI();
		}
		if (error instanceof Error) {
			return error.message;
		}
		return String(error);
	}

	private getStatusCode(): number {
		switch (this.code) {
			case AppErrorCode.NOT_FOUND:
				return 404;
			case AppErrorCode.VALIDATION:
			case AppErrorCode.CONFIG:
				return 400;
			case AppErrorCode.NOT_IMPLEMENTED:
				return 501;
			default:
				return 500;
		}
	}
}
