import { AppError } from "./app-error.ts";
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

export async function requireProjectRoot(): Promise<string> {
	if (_explicitProjectPath) {
		const { stat } = await import("node:fs/promises");
		try {
			const s = await stat(_explicitProjectPath);
			if (!s.isDirectory()) {
				console.error(`error: --path '${_explicitProjectPath}' is not a directory`);
				process.exit(1);
			}
		} catch {
			console.error(`error: --path '${_explicitProjectPath}' does not exist`);
			process.exit(1);
		}
		return _explicitProjectPath;
	}

	let runtimeCwd: RuntimeCwdResolution;
	try {
		runtimeCwd = await resolveRuntimeCwd();
	} catch (error) {
		const message = AppError.formatCLIError(error);
		console.error(message);
		process.exit(1);
	}

	const root = await findBacklogRoot(runtimeCwd.cwd);
	if (!root) {
		console.error("No Backlog.md project found. Run `backlog init` to initialize.");
		process.exit(1);
	}
	return root;
}
