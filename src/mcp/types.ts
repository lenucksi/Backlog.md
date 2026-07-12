import type {
	CallToolResult,
	GetPromptResult,
	ReadResourceResult,
	ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";

export type {
	ListPromptsResult,
	ListResourcesResult,
	ListResourceTemplatesResult,
	ListToolsResult,
	Prompt,
	Resource,
	Tool,
} from "@modelcontextprotocol/sdk/types.js";
export type { CallToolResult, GetPromptResult, ReadResourceResult };

export interface McpToolHandler {
	name: string;
	description: string;
	inputSchema: object;
	annotations?: ToolAnnotations;
	handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

export interface McpResourceHandler {
	uri: string;
	name?: string;
	description?: string;
	mimeType?: string;
	handler: (uri: string) => Promise<ReadResourceResult>;
}

export interface McpPromptHandler {
	name: string;
	description?: string;
	arguments?: Array<{
		name: string;
		description?: string;
		required?: boolean;
	}>;
	handler: (args: Record<string, unknown>) => Promise<GetPromptResult>;
}
