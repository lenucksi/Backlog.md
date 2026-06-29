import { Command } from "commander";
import { BACKLOG_CWD_ENV } from "../utils/runtime-cwd.ts";

const originalArgv = process.argv;
const originalExit = process.exit;
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalBacklogCwd = process.env[BACKLOG_CWD_ENV];

export interface RunResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

export async function runBacklogCmd(args: string[], cwd: string): Promise<RunResult> {
	const logs: string[] = [];
	const errors: string[] = [];

	process.env[BACKLOG_CWD_ENV] = cwd;
	process.argv = ["bun", "src/cli.ts", ...args];
	console.log = (...a: unknown[]) => logs.push(a.map(String).join(" "));
	console.error = (...a: unknown[]) => errors.push(a.map(String).join(" "));
	console.warn = (...a: unknown[]) => errors.push(a.map(String).join(" "));
	process.exit = ((code?: number) => {
		throw new ProcessExitError(code);
	}) as (code?: number) => never;
	(process as { exitCode: unknown }).exitCode = null;

	return await runWithFreshProgram(args, cwd, logs, errors);
}

async function runWithFreshProgram(args: string[], _cwd: string, logs: string[], errors: string[]): Promise<RunResult> {
	let exitCode: number | null = null;
	const program = new Command();
	program.exitOverride();

	const { registerTaskCommand } = await import("../commands/task.ts");
	const { registerInitCommand } = await import("../commands/init.ts");
	const { registerConfigCommand } = await import("../commands/config.ts");

	registerInitCommand(program);
	registerTaskCommand(program);
	registerConfigCommand(program);

	try {
		await program.parseAsync(args, { from: "user" });
	} catch (err: unknown) {
		if (err instanceof ProcessExitError) {
			exitCode = err.code ?? null;
		} else if (err instanceof Error && (err as { code?: string }).code === "commander.exit") {
			// Commander exitOverride throws mild errors for help etc.
			exitCode = (err as { exitCode?: number }).exitCode ?? null;
		} else {
			// Unknown errors, re-throw
			throw err;
		}
	}

	return {
		stdout: logs.join("\n"),
		stderr: errors.join("\n"),
		exitCode,
	};
}

export function restoreGlobals(): void {
	process.argv = originalArgv;
	process.exit = originalExit;
	console.log = originalLog;
	console.error = originalError;
	console.warn = originalWarn;
	if (originalBacklogCwd === undefined) {
		delete process.env[BACKLOG_CWD_ENV];
	} else {
		process.env[BACKLOG_CWD_ENV] = originalBacklogCwd;
	}
}

class ProcessExitError extends Error {
	code: number | undefined;
	constructor(code?: number) {
		super(`process.exit(${code})`);
		this.code = code;
	}
}
