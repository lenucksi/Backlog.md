import { $ } from "bun";

const targets: Record<string, Record<string, string>> = {
	linux: { x64: "bun-linux-x64-baseline", arm64: "bun-linux-arm64" },
	darwin: { x64: "bun-darwin-x64", arm64: "bun-darwin-arm64" },
	win32: { x64: "bun-windows-x64-baseline" },
};

const plat = process.platform;
const arch = process.arch;
const target = targets[plat]?.[arch];

if (!target) {
	console.error("Unsupported platform: " + plat + " " + arch);
	process.exit(1);
}

await $`bun run build:guard`;
await $`bun run build:css`;

const ver = Bun.spawnSync(["jq", "-r", ".version", "package.json"]).stdout.toString().trim();
const ext = plat === "win32" ? ".exe" : "";
const outfile = "dist/backlog" + ext;

// Bundle web app for SPA using plugin to stub bun imports
const webBuild = await Bun.build({
	entrypoints: ["./src/web/main.tsx"],
	outdir: "dist/web",
	target: "browser",
	minify: true,
	define: {
		"process.env.NODE_ENV": '"production"',
	},
	plugins: [
		{
			name: "stub-bun",
			setup(build) {
				build.onResolve({ filter: /^bun$/ }, () => ({
					path: "bun-stub",
					namespace: "stub",
				}));
				build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
					contents: "export const $ = () => {}; export const spawn = () => {}; export default { $, spawn };",
					loader: "js",
				}));
			},
		},
	],
});
if (!webBuild.success) {
	for (const log of webBuild.logs) console.error(log);
	process.exit(1);
}

// Patch dist/web/main.js to remove Firefox "unreachable code after return" from chevrotain
const mainJsPath = "dist/web/main.js";
let mainJs = await Bun.file(mainJsPath).text();
mainJs = mainJs.replace(/;\s*\(0,\s*eval\)\s*\(\w+\)\s*\}/g, "}");
await Bun.write(mainJsPath, mainJs);

await Bun.write("dist/web/main.css", Bun.file("src/web/styles/style.css"));
const html = await Bun.file("src/web/index.html").text();
const bundledHtml = html
	.replace('src="./main.tsx"', 'src="./web/main.js"')
	.replace('href="./styles/style.css"', 'href="./web/main.css"');
await Bun.write("dist/index.html", bundledHtml);

const result = Bun.spawnSync(["bun", "build", "src/cli.ts",
	"--compile", "--minify",
	"--target=" + target,
	"--external=bun",
	"--define=__EMBEDDED_VERSION__=" + JSON.stringify(ver),
	"--outfile=" + outfile,
]);

if (!result.success) {
	process.exit(result.exitCode);
}

console.log("Built " + outfile + " (target: " + target + ")");
