import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Core } from "../core/backlog.ts";
import { initializeProject } from "../core/init.ts";
import { createUniqueTestDir, getPlatformTimeout, isWindows, safeCleanup, sleep } from "./test-utils.ts";

const CLI_PATH = join(process.cwd(), "src", "cli.ts");
const START_MESSAGE = "Backlog.md MCP server started (stdio transport)";

let TEST_DIR: string;

type ExitResult = { code: number | null; signal: string | null };

function waitForSubstring(stream: ReadableStream<Uint8Array>, substring: string, timeoutMs: number): Promise<void> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reader.cancel();
			reject(new Error(`Timed out waiting for: ${substring}`));
		}, timeoutMs);

		function pump(): void {
			reader.read().then(
				({ done, value }) => {
					if (done) {
						clearTimeout(timer);
						reject(new Error(`Stream ended before receiving: ${substring}`));
						return;
					}
					buffer += decoder.decode(value, { stream: true });
					if (buffer.includes(substring)) {
						clearTimeout(timer);
						reader.cancel();
						resolve();
						return;
					}
					pump();
				},
				(error: unknown) => {
					clearTimeout(timer);
					reject(error instanceof Error ? error : new Error(String(error)));
				},
			);
		}
		pump();
	});
}

function waitForExit(child: ReturnType<typeof Bun.spawn>, timeoutMs: number): Promise<ExitResult> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			reject(new Error("Timed out waiting for MCP process to exit"));
		}, timeoutMs);

		child.exited.then(
			(code) => {
				clearTimeout(timer);
				resolve({ code, signal: null });
			},
			() => {
				clearTimeout(timer);
				resolve({ code: null, signal: "SIGKILL" });
			},
		);
	});
}

function withTimeout<T>(operation: Promise<T>, label: string, timeoutMs: number, details: () => string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms.${details()}`));
		}, timeoutMs);

		operation.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error: unknown) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}

function getText(content: unknown): string {
	if (!Array.isArray(content)) {
		return "";
	}

	const item = content[0];
	if (!item || typeof item !== "object" || !("text" in item)) {
		return "";
	}

	const text = (item as { text?: unknown }).text;
	return typeof text === "string" ? text : "";
}

describe("MCP stdio shutdown", () => {
	const itIfNotWindows = isWindows() ? it.skip : it;

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("mcp-stdio");
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		await safeCleanup(TEST_DIR);
	});

	itIfNotWindows(
		"exits when stdin closes",
		async () => {
			const timeout = getPlatformTimeout(8000);
			const child = Bun.spawn({
				cmd: ["bun", CLI_PATH, "mcp", "start", "--debug"],
				cwd: TEST_DIR,
				stdio: ["pipe", "pipe", "pipe"],
			});

			if (!child.stderr || !child.stdin) {
				child.kill("SIGKILL");
				throw new Error("Failed to spawn MCP process with stdio pipes");
			}

			await waitForSubstring(child.stderr, START_MESSAGE, timeout);
			await sleep(50);
			child.stdin.end();

			const result = await waitForExit(child, timeout);
			expect(result.code).toBe(0);
			expect(result.signal).toBeNull();
		},
		15000,
	);

	it("keeps stdio sessions alive after listing tools so document calls can respond", async () => {
		const timeout = getPlatformTimeout(10000);
		const core = new Core(TEST_DIR);
		await initializeProject(core, {
			projectName: "MCP Stdio Document Project",
			integrationMode: "none",
			agentInstructions: [],
			advancedConfig: { autoCommit: false },
		});
		await core.disposeContentStore();

		let stderr = "";
		const transport = new StdioClientTransport({
			command: "bun",
			args: [CLI_PATH, "mcp", "start", "--cwd", TEST_DIR, "--debug"],
			cwd: process.cwd(),
			stderr: "pipe",
		});
		transport.stderr?.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		const client = new Client({ name: "MCP Stdio Document Test", version: "1.0.0" }, { capabilities: {} });

		try {
			await withTimeout(client.connect(transport), "connect", timeout, () => ` stderr:\n${stderr}`);

			const tools = await withTimeout(client.listTools(), "listTools", timeout, () => ` stderr:\n${stderr}`);
			expect(tools.tools.map((tool) => tool.name)).toContain("document_create");

			const result = await withTimeout(
				client.callTool({
					name: "document_create",
					arguments: {
						title: "Stdio Repro Doc",
						content: "Created through stdio transport.",
					},
				}),
				"document_create",
				timeout,
				() => ` stderr:\n${stderr}`,
			);

			const text = getText(result.content);
			expect(text).toContain("Document created successfully.");
			expect(text).toMatch(/Document doc-\d+ - Stdio Repro Doc/);
		} finally {
			await client.close().catch(() => {});
		}
	}, 30000);
});
