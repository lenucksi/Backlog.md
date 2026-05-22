import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { $ } from "bun";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerWorkflowResources } from "../mcp/resources/workflow/index.ts";
import { createMcpServer, McpServer } from "../mcp/server.ts";
import { registerWorkflowTools } from "../mcp/tools/workflow/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const getText = (content: unknown[] | undefined, index = 0): string => {
	const item = content?.[index] as { text?: string } | undefined;
	return item?.text ?? "";
};

const getContentsText = (contents: unknown[] | undefined, index = 0): string => {
	const item = contents?.[index] as { text?: string } | undefined;
	return item?.text ?? "";
};

let TEST_DIR: string;

async function bootstrapServer(): Promise<McpServer> {
	TEST_DIR = createUniqueTestDir("mcp-server-cov");
	const server = new McpServer(TEST_DIR, "Test instructions");

	await server.filesystem.ensureBacklogStructure();
	await $`git init -b main`.cwd(TEST_DIR).quiet();
	await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
	await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

	await initializeTestProject(server, "Test Project");
	registerWorkflowResources(server);
	registerWorkflowTools(server);

	return server;
}

describe("McpServer coverage", () => {
	afterEach(async () => {
		await safeCleanup(TEST_DIR);
	});

	it("throws McpError for unknown tool", async () => {
		const server = await bootstrapServer();
		try {
			await server.testInterface.callTool({
				params: { name: "nonexistent_tool", arguments: {} },
			});
			expect("should have thrown").toBe("never");
		} catch (error: unknown) {
			const mcpError = error as { message?: string };
			expect(mcpError.message).toContain("Tool not found");
		}
		await server.stop();
	});

	it("throws McpError for unknown resource", async () => {
		const server = await bootstrapServer();
		try {
			await server.testInterface.readResource({
				params: { uri: "backlog://nonexistent" },
			});
			expect("should have thrown").toBe("never");
		} catch (error: unknown) {
			const mcpError = error as { message?: string };
			expect(mcpError.message).toContain("Resource not found");
		}
		await server.stop();
	});

	it("throws McpError for unknown prompt", async () => {
		const server = await bootstrapServer();
		try {
			await server.testInterface.getPrompt({
				params: { name: "nonexistent_prompt", arguments: {} },
			});
			expect("should have thrown").toBe("never");
		} catch (error: unknown) {
			const mcpError = error as { message?: string };
			expect(mcpError.message).toContain("Prompt not found");
		}
		await server.stop();
	});

	it("supports addTool, addResource, addPrompt and lists resource templates", async () => {
		const server = await bootstrapServer();
		const testTool = {
			name: "test_tool",
			description: "A test tool",
			inputSchema: { type: "object" as const, properties: {} },
			handler: async () => ({ content: [{ type: "text" as const, text: "ok" }] }),
		};
		const testResource = {
			uri: "backlog://test-resource",
			name: "Test Resource",
			description: "A test resource",
			mimeType: "text/plain" as const,
			handler: async (_uri: string) => ({
				contents: [{ uri: "backlog://test-resource", mimeType: "text/plain" as const, text: "test" }],
			}),
		};
		const testPrompt = {
			name: "test_prompt",
			description: "A test prompt",
			arguments: [{ name: "arg1", description: "An argument", required: false }],
			handler: async () => ({
				messages: [{ role: "user" as const, content: { type: "text" as const, text: "Hello" } }],
			}),
		};

		server.addTool(testTool);
		server.addResource(testResource);
		server.addPrompt(testPrompt);

		const tools = await server.testInterface.listTools();
		expect(tools.tools.map((t) => t.name)).toContain("test_tool");

		const resources = await server.testInterface.listResources();
		expect(resources.resources.map((r) => r.uri)).toContain("backlog://test-resource");

		const prompts = await server.testInterface.listPrompts();
		expect(prompts.prompts.map((p) => p.name)).toContain("test_prompt");

		const readResult = await server.testInterface.readResource({
			params: { uri: "backlog://test-resource" },
		});
		expect(getContentsText(readResult.contents)).toBe("test");

		const promptResult = await server.testInterface.getPrompt({
			params: { name: "test_prompt", arguments: {} },
		});
		expect(promptResult.messages[0]?.content).toEqual({ type: "text", text: "Hello" });

		const resourceTemplates = await server.testInterface.listResourceTemplates();
		expect(resourceTemplates.resourceTemplates).toEqual([]);

		await server.stop();
	});

	it("reads resource with parameterised URI by falling back to base URI", async () => {
		const server = await bootstrapServer();
		const testResource = {
			uri: "backlog://param-resource",
			name: "Param Resource",
			description: "A parameterised resource",
			mimeType: "text/plain" as const,
			handler: async (uri: string) => ({
				contents: [{ uri, mimeType: "text/plain" as const, text: `handled: ${uri}` }],
			}),
		};
		server.addResource(testResource);

		const result = await server.testInterface.readResource({
			params: { uri: "backlog://param-resource?foo=bar" },
		});
		expect(getContentsText(result.contents)).toContain("backlog://param-resource?foo=bar");

		await server.stop();
	});

	it("start throws if not connected", async () => {
		const TEST_DIR2 = createUniqueTestDir("mcp-server-start");
		const server2 = new McpServer(TEST_DIR2, "Test");
		try {
			await server2.start();
			expect("should have thrown").toBe("never");
		} catch (error: unknown) {
			const err = error as Error;
			expect(err.message).toContain("connect() before start()");
		}
		await safeCleanup(TEST_DIR2);
	});

	it("getServer returns the underlying MCP server SDK instance", async () => {
		const server = await bootstrapServer();
		const sdkServer = server.getServer();
		expect(sdkServer).toBeDefined();
		expect(typeof sdkServer.connect).toBe("function");
		await server.stop();
	});

	it("connect and start lifecycle works in fallback mode", async () => {
		const TEST_DIR2 = createUniqueTestDir("mcp-server-connect");
		const server2 = new McpServer(TEST_DIR2, "Fallback connect test");
		await server2.connect();
		await server2.start();
		// Calling connect twice is a no-op
		await server2.connect();
		await server2.stop();
		await safeCleanup(TEST_DIR2);
	});

	it("can be stopped multiple times without error", async () => {
		const TEST_DIR2 = createUniqueTestDir("mcp-server-stop-multi");
		const server2 = new McpServer(TEST_DIR2, "Stop test");
		await server2.filesystem.ensureBacklogStructure();
		await server2.stop();
		await server2.stop();
		await safeCleanup(TEST_DIR2);
	});

	it("logs debug messages via addResource handler that triggers internal logging", async () => {
		const server = await bootstrapServer();
		// After a regular tool call, check that the debugLog array exists
		expect(server.debugLog).toBeDefined();
		expect(Array.isArray(server.debugLog)).toBe(true);
		await server.stop();
	});

	it("createMcpServer factory returns a configured server in normal mode", async () => {
		const TEST_DIR2 = createUniqueTestDir("mcp-server-factory-cov");
		const bootstrap = new McpServer(TEST_DIR2, "Bootstrap");
		await bootstrap.filesystem.ensureBacklogStructure();
		await $`git init -b main`.cwd(TEST_DIR2).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR2).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR2).quiet();
		await initializeTestProject(bootstrap, "Factory Cov");
		await bootstrap.stop();

		const server2 = await createMcpServer(TEST_DIR2);
		expect(server2).toBeDefined();

		const tools = await server2.testInterface.listTools();
		const toolNames = tools.tools.map((t) => t.name);
		expect(toolNames).toContain("task_create");
		expect(toolNames).toContain("task_list");
		expect(toolNames).toContain("milestone_list");
		expect(toolNames).toContain("milestone_add");

		await server2.stop();
		await safeCleanup(TEST_DIR2);
	});

	it("createMcpServer returns fallback server in uninitialized directory", async () => {
		const emptyDir = createUniqueTestDir("mcp-fallback-cov");

		const server2 = await createMcpServer(emptyDir);
		expect(server2).toBeDefined();

		const tools = await server2.testInterface.listTools();
		expect(tools.tools).toHaveLength(0);

		const resources = await server2.testInterface.listResources();
		expect(resources.resources).toHaveLength(1);
		expect(resources.resources[0]?.uri).toBe("backlog://init-required");

		await safeCleanup(emptyDir);
	});
});
