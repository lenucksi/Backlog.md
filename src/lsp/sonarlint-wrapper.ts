import { spawn } from "node:child_process";

const ANALYZER_DIR = "/usr/share/java/sonarlint-ls/analyzers";
const ANALYZERS = ["sonarjs.jar", "sonarhtml.jar", "sonarxml.jar", "sonartext.jar", "sonargo.jar", "sonariac.jar"];

const child = spawn("sonarlint-ls", ["-stdio", "-analyzers", ...ANALYZERS.map((a) => `${ANALYZER_DIR}/${a}`)], {
	stdio: ["pipe", "pipe", "pipe"],
});

child.stdout.pipe(process.stdout);
process.stdin.pipe(child.stdin);
child.stderr.pipe(process.stderr);

child.on("exit", (code) => process.exit(code ?? 1));
