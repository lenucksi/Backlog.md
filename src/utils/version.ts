// Kept for sync compatibility — getVersionSync() must remain sync per §4 no-top-level-await rule
import { readFileSync } from "node:fs";

// This will be replaced at build time for compiled executables
declare const __EMBEDDED_VERSION__: string | undefined;

/**
 * Get the version from package.json or embedded version
 * @returns The version string from package.json or embedded at build time
 */
export function getVersionSync(): string {
	if (typeof __EMBEDDED_VERSION__ !== "undefined") {
		return String(__EMBEDDED_VERSION__);
	}
	try {
		const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
		return pkg.version || "0.0.0";
	} catch {
		return "0.0.0";
	}
}

export async function getVersion(): Promise<string> {
	if (typeof __EMBEDDED_VERSION__ !== "undefined") {
		return String(__EMBEDDED_VERSION__);
	}

	try {
		const packageJson = await Bun.file("package.json").json();
		return packageJson.version || "0.0.0";
	} catch {
		return "0.0.0";
	}
}
