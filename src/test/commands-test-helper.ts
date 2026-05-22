import { Command } from "commander";

const originalCwd = process.cwd();
const originalArgv = process.argv;
const originalExit = process.exit;
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

export interface RunResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

let commandCache: Command | null = null;
let commandRegistered = false;

export async function runBacklogCmd(args: string[], cwd: string): Promise<RunResult> {
	const logs: string[] = [];
	const errors: string[] = [];
	let exitCode: number | null = null;

	process.chdir(cwd);
	process.argv = ["bun", "src/cli.ts", ...args];
	console.log = (...a: any[]) => logs.push(a.map(String).join(" "));
	console.error = (...a: any[]) => errors.push(a.map(String).join(" "));
	console.warn = (...a: any[]) => errors.push(a.map(String).join(" "));
	process.exit = ((code?: number) => {
		exitCode = code ?? null;
		throw new ProcessExitError(code);
	}) as (code?: number) => never;
	(process as any).exitCode = null;

	if (!commandRegistered) {
		commandCache = new Command();
		commandCache.exitOverride();
		commandRegistered = true;
	}

	const program = commandCache!;
	program.commands = [];
	// prevent duplicate name errors
	for (const key of Object.keys(program)) {
		if (key === "commands") continue;
	}
	// Re-register every time since we need fresh state
	// We'll rebuild the program each call
	return await runWithFreshProgram(args, cwd, logs, errors);
}

async function runWithFreshProgram(args: string[], cwd: string, logs: string[], errors: string[]): Promise<RunResult> {
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
		} else if (err instanceof Error && (err as any).code === "commander.exit") {
			// Commander exitOverride throws mild errors for help etc.
			exitCode = (err as any).exitCode ?? null;
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
	process.chdir(originalCwd);
	process.argv = originalArgv;
	process.exit = originalExit;
	console.log = originalLog;
	console.error = originalError;
	console.warn = originalWarn;
}

class ProcessExitError extends Error {
	code: number | undefined;
	constructor(code?: number) {
		super(`process.exit(${code})`);
		this.code = code;
	}
}
