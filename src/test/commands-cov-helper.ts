import { Command } from "commander";
import { BACKLOG_CWD_ENV } from "../utils/runtime-cwd.ts";

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

class CliExitError extends Error {
	code: number | undefined;
	constructor(code?: number) {
		super(`process.exit(${code})`);
		this.code = code;
	}
}

export async function runBacklogCli(args: string[], cwd: string): Promise<CliResult> {
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

	process.argv = ["bun", "src/cli.ts", ...args];
	process.exitCode = 0;
	console.log = (...msgs: unknown[]) => stdout.push(msgs.map(String).join(" "));
	console.error = (...msgs: unknown[]) => stderr.push(msgs.map(String).join(" "));
	console.warn = (...msgs: unknown[]) => stderr.push(msgs.map(String).join(" "));
	process.exit = ((code?: number) => {
		exitCode = code ?? 0;
		throw new CliExitError(code);
	}) as (code?: number) => never;

	try {
		const [initMod, taskMod, configMod] = await Promise.all([
			import("../commands/init.ts"),
			import("../commands/task.ts"),
			import("../commands/config.ts"),
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
		delete process.env[BACKLOG_CWD_ENV];
	}

	return {
		stdout: stdout.join("\n").trim(),
		stderr: stderr.join("\n").trim(),
		exitCode,
	};
}
