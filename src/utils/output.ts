type OutputMode = "auto" | "plain" | "json";
let outputMode: OutputMode = "auto";

function setOutputMode(mode: OutputMode) {
	outputMode = mode;
}

export function getOutputMode(): OutputMode {
	return outputMode;
}

export function stdout(data: unknown, formatFn?: (d: unknown) => string) {
	switch (outputMode) {
		case "json":
			process.stdout.write(JSON.stringify(data, null, 2) + "\n");
			break;
		case "plain":
			process.stdout.write((formatFn?.(data) ?? String(data)) + "\n");
			break;
		default:
			process.stdout.write((formatFn?.(data) ?? String(data)) + "\n");
	}
}

export function applyOutputOptions(options: { json?: boolean; plain?: boolean }) {
	setOutputMode("auto");
	if (options.json || process.argv.includes("--json")) {
		setOutputMode("json");
	} else if (options.plain || process.argv.includes("--plain")) {
		setOutputMode("plain");
	}
}
