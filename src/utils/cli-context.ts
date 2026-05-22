import { AppError } from "./app-error.ts";
import { findBacklogRoot } from "./find-backlog-root.ts";
import type { RuntimeCwdResolution } from "./runtime-cwd.ts";
import { resolveRuntimeCwd } from "./runtime-cwd.ts";

export const hasInteractiveTTY = Boolean(process.stdout.isTTY && process.stdin.isTTY);
export const shouldAutoPlain = !hasInteractiveTTY;
const plainFlagInArgv = process.argv.includes("--plain");

export function isPlainRequested(options?: { plain?: boolean }): boolean {
	return Boolean(options?.plain || plainFlagInArgv);
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

export async function requireProjectRoot(): Promise<string> {
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
