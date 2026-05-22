export interface OutputOptions {
	json?: boolean;
}

export function formatOutput<T>(data: T, opts: OutputOptions): string {
	if (opts.json) return JSON.stringify(data, null, 2);
	return "";
}
