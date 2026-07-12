import { Core } from "../core/backlog.ts";
import { AppError } from "./app-error.ts";
import { EXIT } from "./exit-codes.ts";
import { findBacklogRoot } from "./find-backlog-root.ts";
import type { RuntimeCwdResolution } from "./runtime-cwd.ts";
import { resolveRuntimeCwd } from "./runtime-cwd.ts";

export function hasInteractiveTTY(): boolean {
	return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}

export function shouldAutoPlain(): boolean {
	return !hasInteractiveTTY();
}

function hasPlainArgv(): boolean {
	return process.argv.includes("--plain");
}

export function isPlainRequested(options?: { plain?: boolean }): boolean {
	return Boolean(options?.plain || hasPlainArgv());
}

export function createMultiValueAccumulator() {
	return (value: string, previous: string | string[]) => {
		const soFar = Array.isArray(previous) ? previous : previous ? [previous] : [];
		return [...soFar, value];
	};
}

export function printMissingRequiredArgument(argumentName: string): void {
	console.error(`error: missing required argument '${argumentName}'`);
	process.exitCode = 1;
}

let _explicitProjectPath: string | undefined;

export function setExplicitProjectPath(path: string | undefined): void {
	_explicitProjectPath = path;
}

export function getExplicitProjectPath(): string | undefined {
	return _explicitProjectPath;
}

export async function ensureProjectConfig() {
	const cwd = await requireProjectRoot();
	const core = new Core(cwd);
	const config = await core.filesystem.loadConfig();
	if (!config) {
		console.error("No backlog project found. Initialize one first with: backlog init");
		process.exit(EXIT.ERROR);
	}
	return { core, config };
}

export async function requireProjectRoot(): Promise<string> {
	if (_explicitProjectPath) {
		const { stat } = await import("node:fs/promises");
		try {
			const s = await stat(_explicitProjectPath);
			if (!s.isDirectory()) {
				console.error(`error: --path '${_explicitProjectPath}' is not a directory`);
				process.exit(EXIT.ERROR);
			}
		} catch {
			console.error(`error: --path '${_explicitProjectPath}' does not exist`);
			process.exit(EXIT.ERROR);
		}
		return _explicitProjectPath;
	}

	let runtimeCwd: RuntimeCwdResolution;
	try {
		runtimeCwd = await resolveRuntimeCwd();
	} catch (error) {
		const message = AppError.formatCLIError(error);
		console.error(message);
		process.exit(EXIT.ERROR);
	}

	const root = await findBacklogRoot(runtimeCwd.cwd);
	if (!root) {
		console.error("No Backlog.md project found. Run `backlog init` to initialize.");
		process.exit(EXIT.ERROR);
	}
	return root;
}
