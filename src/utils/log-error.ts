import { getLogger } from "./logger.ts";

export function tryWarn(context: string, error: unknown, fn: string): void {
	getLogger().warn(`[${context}] ${fn}: ${error instanceof Error ? error.message : String(error)}`);
}
