import { Command } from "commander";
import { setExplicitProjectPath } from "../utils/cli-context.ts";
import { BACKLOG_CWD_ENV } from "../utils/runtime-cwd.ts";
import { getVersionSync } from "../utils/version.ts";

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface RunBacklogCliOptions {
	tty?: boolean;
}

class CliExitError extends Error {
	code: number | undefined;
	constructor(code?: number) {
		super(`process.exit(${code})`);
		this.code = code;
	}
}

export async function runBacklogCli(args: string[], cwd: string, options?: RunBacklogCliOptions): Promise<CliResult> {
	process.env[BACKLOG_CWD_ENV] = cwd;

	const stdout: string[] = [];
	const stderr: string[] = [];
	let exitCode = 0;

	const originalArgv = process.argv;
	const originalExitCode = process.exitCode;
	const originalExit = process.exit;
	const originalLog = console.log;
	const originalError = console.error;
	const originalWarn = console.warn;
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);
	const originalStdoutIsTTY = (process.stdout as { isTTY?: boolean }).isTTY;
	const originalStdinIsTTY = (process.stdin as { isTTY?: boolean }).isTTY;

	process.argv = ["bun", "src/cli.ts", ...args];
	process.exitCode = 0;
	console.log = (...msgs: unknown[]) => stdout.push(msgs.map(String).join(" "));
	console.error = (...msgs: unknown[]) => stderr.push(msgs.map(String).join(" "));
	console.warn = (...msgs: unknown[]) => stderr.push(msgs.map(String).join(" "));
	if (options?.tty !== undefined) {
		Object.defineProperty(process.stdout, "isTTY", { value: options.tty, configurable: true });
		Object.defineProperty(process.stdin, "isTTY", { value: options.tty, configurable: true });
	}
	const writeCapture = (chunk: string | Uint8Array) => {
		stdout.push(String(chunk));
		return true;
	};
	process.stdout.write = writeCapture;
	process.stderr.write = (chunk: string | Uint8Array) => {
		stderr.push(String(chunk));
		return true;
	};
	process.exit = ((code?: number) => {
		exitCode = code ?? 0;
		throw new CliExitError(code);
	}) as (code?: number) => never;

	try {
		const [initMod, taskMod, configMod, draftMod, docMod, decisionMod, boardMod, agentsMod] = await Promise.all([
			import("../commands/init.ts"),
			import("../commands/task.ts"),
			import("../commands/config.ts"),
			import("../commands/draft.ts"),
			import("../commands/doc.ts"),
			import("../commands/decision.ts"),
			import("../commands/board.ts"),
			import("../commands/agents.ts"),
		]);
		const program = new Command();
		program.exitOverride();
		program.configureOutput({
			writeOut: (str: string) => stdout.push(str),
			writeErr: (str: string) => stderr.push(str),
		});

		initMod.registerInitCommand(program);
		taskMod.registerTaskCommand(program);
		configMod.registerConfigCommand(program);
		draftMod.registerDraftCommand(program);
		docMod.registerDocCommand(program);
		decisionMod.registerDecisionCommand(program);
		boardMod.registerBoardCommand(program, getVersionSync());
		agentsMod.registerAgentsCommand(program);

		await program.parseAsync(process.argv);
		if (process.exitCode) {
			exitCode = process.exitCode;
		}
	} catch (err: unknown) {
		if (err instanceof CliExitError) {
			exitCode = err.code ?? 1;
		} else if (err instanceof Error && (err as { code?: string }).code === "commander.exit") {
			exitCode = (err as { exitCode?: number }).exitCode ?? 1;
		} else if (err instanceof Error && (err as { code?: string }).code === "commander.help") {
			exitCode = 0;
		} else if (err instanceof Error) {
			stderr.push(err.message);
			exitCode = 1;
		} else {
			throw err;
		}
	} finally {
		process.argv = originalArgv;
		process.exitCode = originalExitCode;
		process.exit = originalExit;
		console.log = originalLog;
		console.error = originalError;
		console.warn = originalWarn;
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
		Object.defineProperty(process.stdout, "isTTY", { value: originalStdoutIsTTY, configurable: true });
		Object.defineProperty(process.stdin, "isTTY", { value: originalStdinIsTTY, configurable: true });
		delete process.env[BACKLOG_CWD_ENV];
		setExplicitProjectPath(undefined);
	}

	return {
		stdout: stdout.join("\n").trim(),
		stderr: stderr.join("\n").trim(),
		exitCode,
	};
}
