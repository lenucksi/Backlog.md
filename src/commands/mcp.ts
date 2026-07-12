import { EXIT } from "../utils/exit-codes.ts";
import { getLogger, setLogLevel } from "../utils/logger.ts";
/**
 * MCP Command Group - Model Context Protocol CLI commands.
 *
 * This simplified command set focuses on the stdio transport, which is the
 * only supported transport for Backlog.md's local MCP integration.
 */

import type { Command } from "commander";
import { createMcpServer } from "../mcp/server.ts";
import { getExplicitProjectPath, setExplicitProjectPath } from "../utils/cli-context.ts";
import { findBacklogRoot } from "../utils/find-backlog-root.ts";
import { resolveRuntimeCwd } from "../utils/runtime-cwd.ts";

type StartOptions = {
	debug?: boolean;
	cwd?: string;
	path?: string;
};

/**
 * Register MCP command group with CLI program.
 *
 * @param program - Commander program instance
 */
export function registerMcpCommand(program: Command): void {
	const mcpCmd = program.command("mcp");
	registerStartCommand(mcpCmd);
}

/**
 * Register 'mcp start' command for stdio transport.
 */
function registerStartCommand(mcpCmd: Command): void {
	mcpCmd
		.command("start")
		.description("Start the MCP server using stdio transport")
		.option("-d, --debug", "Enable debug logging", false)
		.option("--cwd <path>", "Directory to resolve Backlog root from (overrides BACKLOG_CWD)")
		.option("--path <path>", "Explicit Backlog.md project root (takes precedence over --cwd)")
		.action(async (options: StartOptions) => {
			try {
				if (options.debug) setLogLevel("debug");
				const rootPath = options.path || getExplicitProjectPath();
				let projectRoot: string;
				if (rootPath) {
					setExplicitProjectPath(rootPath);
					projectRoot = rootPath;
				} else {
					const runtimeCwd = await resolveRuntimeCwd({ cwd: options.cwd });
					projectRoot = (await findBacklogRoot(runtimeCwd.cwd)) ?? runtimeCwd.cwd;
				}
				const server = await createMcpServer(projectRoot, { debug: options.debug });

				await server.connect();
				await server.start();

				if (options.debug) {
					getLogger().debug(`Backlog root: ${projectRoot}`);
					getLogger().debug("Backlog.md MCP server started (stdio transport)");
				}

				let shutdownTriggered = false;
				const shutdown = async (signal: string) => {
					if (shutdownTriggered) {
						return;
					}
					shutdownTriggered = true;
					if (options.debug) {
						getLogger().debug(`Received ${signal}, shutting down MCP server...`);
					}

					try {
						await server.stop();
						process.exit(EXIT.SUCCESS);
					} catch (error) {
						getLogger().error(
							"Error during MCP server shutdown:",
							error instanceof Error ? error.message : String(error),
						);
						process.exit(EXIT.ERROR);
					}
				};

				const handleStdioClose = () => shutdown("stdio");
				process.stdin.once("end", handleStdioClose);
				if (process.platform !== "win32") {
					// On Windows, stdin can emit "close" while the MCP stdio pipe is still usable.
					process.stdin.once("close", handleStdioClose);
				}

				const handlePipeError = (error: unknown) => {
					const code =
						error && typeof error === "object" && "code" in error
							? String((error as { code?: string }).code ?? "")
							: "";
					if (code === "EPIPE") {
						void shutdown("EPIPE");
					}
				};
				process.stdout.once("error", handlePipeError);
				process.stderr.once("error", handlePipeError);

				process.once("SIGINT", () => shutdown("SIGINT"));
				process.once("SIGTERM", () => shutdown("SIGTERM"));
				if (process.platform !== "win32") {
					process.once("SIGHUP", () => shutdown("SIGHUP"));
					process.once("SIGPIPE", () => shutdown("SIGPIPE"));
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				getLogger().error(`Failed to start MCP server: ${message}`);
				process.exit(EXIT.ERROR);
			}
		});
}
