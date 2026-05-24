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

// --external bun: workaround for bun 1.3.x --target regression with "bun" builtin imports.
// bun is a runtime builtin in compiled binaries, so external is safe.
const result = await Bun.build({
	entrypoints: ["./src/cli.ts"],
	outfile,
	target: target as any,
	compile: true,
	minify: true,
	external: ["bun"],
	define: {
		__EMBEDDED_VERSION__: JSON.stringify(ver),
	},
});

if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}
	process.exit(1);
}

console.log("Built " + outfile + " (target: " + target + ")");
