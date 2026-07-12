import { stdin as input, stdout as processStdout } from "node:process";
import { createInterface } from "node:readline/promises";
import * as clack from "@clack/prompts";
import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { getExplicitProjectPath } from "../utils/cli-context.ts";
import { EXIT } from "../utils/exit-codes.ts";
import { findBacklogRoot } from "../utils/find-backlog-root.ts";
import { stdout as cliOutput } from "../utils/output.ts";
import { resolveRuntimeCwd } from "../utils/runtime-cwd.ts";

export function registerBrowserCommand(program: Command): void {
	program
		.command("browser")
		.description("open browser interface for task management (press Ctrl+C or Cmd+C to stop)")
		.option("-p, --port <port>", "port to run server on")
		.option("--no-open", "don't automatically open browser")
		.option("--non-interactive", "automatically use next free port without asking")
		.action(async (options) => {
			try {
				const runtimeCwd = await resolveRuntimeCwd();
				const explicitPath = getExplicitProjectPath();
				const startDir = explicitPath || runtimeCwd.cwd;
				let cwd = await findBacklogRoot(startDir);
				if (!cwd) {
					cliOutput("\nNo Backlog.md project found in this directory.");
					const openWizard = await clack.confirm({
						message: explicitPath ? `Initialize at ${explicitPath}?` : "Open web initialization wizard?",
						initialValue: true,
					});
					if (openWizard) {
						cwd = startDir;
					} else {
						cliOutput("Run `backlog init` to initialize.");
						process.exit(EXIT.SUCCESS);
					}
				}
				const { BacklogServer, findNextAvailablePort, isPortAvailable } = await import("../server/index.ts");
				const server = new BacklogServer(cwd);

				const core = new Core(cwd);
				const config = await core.filesystem.loadConfig();
				const defaultPort = config?.defaultPort ?? 6420;

				let port = Number.parseInt(options.port || defaultPort.toString(), 10);
				if (Number.isNaN(port) || port < 1 || port > 65535) {
					console.error("Invalid port number. Must be between 1 and 65535.");
					process.exit(EXIT.ERROR);
				}

				if (!(await isPortAvailable(port))) {
					const nextPort = await findNextAvailablePort(port + 1);
					if (options.nonInteractive) {
						cliOutput(`⚠️  Port ${port} is already in use. Using port ${nextPort} instead.`);
						port = nextPort;
					} else {
						const rl = createInterface({ input, output: processStdout });
						const answer = (
							await rl.question(
								`\n⚠️  Port ${port} is already in use.\n💡 Port ${nextPort} is available. Start on port ${nextPort}? [Y/n] `,
							)
						)
							.trim()
							.toLowerCase();
						rl.close();
						if (answer === "" || answer === "y") {
							port = nextPort;
						} else {
							cliOutput("Aborted.");
							process.exit(EXIT.SUCCESS);
						}
					}
				}

				await server.start(port, options.open !== false);

				let shuttingDown = false;
				const shutdown = async (signal: string) => {
					if (shuttingDown) return;
					shuttingDown = true;
					cliOutput(`\nReceived ${signal}. Shutting down server...`);
					try {
						const stopPromise = server.stop();
						const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
						await Promise.race([stopPromise, timeout]);
					} finally {
						process.exit(EXIT.SUCCESS);
					}
				};

				process.once("SIGINT", () => void shutdown("SIGINT"));
				process.once("SIGTERM", () => void shutdown("SIGTERM"));
				process.once("SIGQUIT", () => void shutdown("SIGQUIT"));
			} catch (err) {
				console.error("Failed to start browser interface", err instanceof Error ? err.message : String(err));
				process.exitCode = 1;
			}
		});
}
