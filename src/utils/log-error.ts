export function tryWarn(context: string, error: unknown, fn: string): void {
	console.warn(`[${context}] ${fn}: ${error instanceof Error ? error.message : String(error)}`);
}

export function logAndReturn<T>(context: string, error: unknown, fallback: T, fn = "unknown"): T {
	tryWarn(context, error, fn);
	return fallback;
}
