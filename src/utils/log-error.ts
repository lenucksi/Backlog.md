export function tryWarn(context: string, error: unknown, fn: string): void {
	console.warn(`[${context}] ${fn}: ${error instanceof Error ? error.message : String(error)}`);
}
