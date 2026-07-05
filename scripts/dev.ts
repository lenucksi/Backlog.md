import { spawn } from "bun";

const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function prefixStream(stream: ReadableStream<Uint8Array>, label: string, color: string) {
	const decoder = new TextDecoder();
	(async () => {
		const reader = stream.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const text = decoder.decode(value, { stream: true });
			for (const line of text.split("\n")) {
				if (line.length > 0) {
					console.log(`${color}[${label}]${RESET} ${line}`);
				}
			}
		}
	})();
}

const api = spawn(["bun", "--watch", "src/cli.ts", "browser", "--non-interactive", "--no-open"]);
const ui = spawn(["bun", "x", "vite"]);

if (api.stdout) prefixStream(api.stdout, "api", BLUE);
if (api.stderr) prefixStream(api.stderr, "api", BLUE);
if (ui.stdout) prefixStream(ui.stdout, "ui", GREEN);
if (ui.stderr) prefixStream(ui.stderr, "ui", GREEN);

function cleanup() {
	api.kill("SIGTERM");
	ui.kill("SIGTERM");
}

process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });

await Promise.all([api.exited, ui.exited]);
