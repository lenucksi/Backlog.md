import { Command } from "commander";

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

const originalCwd = process.cwd();
const originalArgv = process.argv;
const originalExit = process.exit;
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

let helpersInitialized = false;
let registerInit: ((program: Command) => void) | null = null;
let registerTask: ((program: Command) => void) | null = null;
let registerConfig: ((program: Command) => void) | null = null;

async function initHelpers() {
	if (helpersInitialized) return;
	const [initMod, taskMod, configMod] = await Promise.all([
		import("../commands/init.ts"),
		import("../commands/task.ts"),
		import("../commands/config.ts"),
	]);
	registerInit = initMod.registerInitCommand;
	registerTask = taskMod.registerTaskCommand;
	registerConfig = configMod.registerConfigCommand;
	helpersInitialized = true;
}

export async function runBacklogCli(args: string[], cwd: string): Promise<CliResult> {
	const stdout: string[] = [];
	const stderr: string[] = [];
	let exitCode = 0;

	process.chdir(cwd);
	process.argv = ["bun", "src/cli.ts", ...args];
	console.log = (...msgs: any[]) => stdout.push(msgs.map(String).join(" "));
	console.error = (...msgs: any[]) => stderr.push(msgs.map(String).join(" "));
	console.warn = (...msgs: any[]) => stderr.push(msgs.map(String).join(" "));
	process.exit = ((code?: number) => {
		exitCode = code ?? 0;
		throw new CliExitError(code);
	}) as (code?: number) => never;

	try {
		await initHelpers();
		const program = new Command();
		program.exitOverride();

		registerInit!(program);
		registerTask!(program);
		registerConfig!(program);

		await program.parseAsync(process.argv);
	} catch (err: unknown) {
		if (err instanceof CliExitError) {
			exitCode = exitCode || 1;
		} else if (err instanceof Error && (err as any).code === "commander.exit") {
			exitCode = (err as any).exitCode ?? 1;
		} else if (err instanceof Error && (err as any).code === "commander.help") {
			exitCode = 0;
		} else {
			throw err;
		}
	} finally {
		process.chdir(originalCwd);
		process.argv = originalArgv;
		process.exit = originalExit;
		console.log = originalLog;
		console.error = originalError;
		console.warn = originalWarn;
	}

	return { stdout: stdout.join("\n"), stderr: stderr.join("\n"), exitCode };
}

class CliExitError extends Error {
	code: number | undefined;
	constructor(code?: number) {
		super(`process.exit(${code})`);
		this.code = code;
	}
}
