import { AppError, handleBacklogToolError } from "../errors/mcp-errors.ts";
import type { CallToolResult, McpToolHandler } from "../types.ts";
import type { JsonSchema, ValidationResult } from "./validators.ts";
import { validateInput } from "./validators.ts";

/**
 * Validation context for tool calls
 */
export type ValidationContext = {
	clientId?: string;
	timestamp: number;
};

/**
 * Tool handler function with validation context
 */
export type ValidatedToolHandler<T = Record<string, unknown>> = (
	input: T,
	context: ValidationContext,
) => Promise<CallToolResult>;

/**
 * Creates a validated tool wrapper that adds comprehensive validation and error handling
 */
function createValidatedTool<T extends Record<string, unknown>>(
	toolDefinition: Omit<McpToolHandler, "handler">,
	validator: (input: unknown, context?: ValidationContext) => Promise<ValidationResult> | ValidationResult,
	handler: ValidatedToolHandler<T>,
): McpToolHandler {
	return {
		...toolDefinition,
		async handler(request: Record<string, unknown>, clientId?: string): Promise<CallToolResult> {
			const context: ValidationContext = {
				clientId,
				timestamp: Date.now(),
			};

			try {
				// Input validation
				const validationResult = await validator(request, context);

				if (!validationResult.isValid) {
					throw AppError.validation(
						`Validation failed: ${validationResult.errors.join(", ")}`,
						validationResult.errors,
					);
				}

				const result = await handler(validationResult.sanitizedData as T, context);

				return result;
			} catch (error) {
				// Log error for debugging (but don't expose sensitive details)
				if (process.env.DEBUG) {
					console.error(`Tool '${toolDefinition.name}' error:`, {
						clientId: context.clientId,
						timestamp: context.timestamp,
						error: error instanceof Error ? error.message : String(error),
					});
				}

				return handleBacklogToolError(error);
			}
		},
	};
}

/**
 * Creates a simple validator from a JSON Schema
 */
function createSchemaValidator(schema: JsonSchema): (input: unknown) => ValidationResult {
	return (input: unknown) => validateInput(input, schema);
}

/**
/**
 * Wrapper for tools that don't need custom validation beyond schema
 */
export function createSimpleValidatedTool<T extends Record<string, unknown>>(
	toolDefinition: Omit<McpToolHandler, "handler">,
	schema: JsonSchema,
	handler: ValidatedToolHandler<T>,
): McpToolHandler {
	return createValidatedTool(toolDefinition, createSchemaValidator(schema), handler);
}
