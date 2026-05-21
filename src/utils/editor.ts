import { platform } from "node:os";
import { $ } from "bun";
import type { BacklogConfig } from "../types/index.ts";

/**
 * Get the default editor based on the operating system
 */
export function getPlatformDefaultEditor(os?: string): string {
	const currentOs = os ?? platform();
	switch (currentOs) {
		case "win32":
			return "notepad";
		case "darwin":
			return "nano";
		case "linux":
			return "nano";
		default:
			return "vi";
	}
}

/**
 * Resolve the editor command based on configuration, environment, and platform defaults
 * Priority: EDITOR env var -> config.defaultEditor -> platform default
 */
export function resolveEditor(config?: BacklogConfig | null): string {
	// First check environment variable
	const editorEnv = process.env.EDITOR;
	if (editorEnv) {
		return editorEnv;
	}

	// Then check config
	if (config?.defaultEditor) {
		return config.defaultEditor;
	}

	// Finally use platform default
	return getPlatformDefaultEditor();
}

/**
 * Check if an editor command is available on the system
 */
export async function isEditorAvailable(editor: string, os?: string): Promise<boolean> {
	try {
		// Split the editor command in case it has arguments
		const parts = editor.split(" ");
		const command = parts[0] ?? editor;
		const currentOs = os ?? platform();

		if (currentOs === "win32") {
			try {
				await $`where ${command}`.quiet();
				return true;
			} catch {
				return false;
			}
		}

		try {
			await $`which ${command}`.quiet();
			return true;
		} catch {
			return false;
		}
	} catch {
		return false;
	}
}

/**
 * Open a file in the editor
 */
export async function openInEditor(filePath: string, config?: BacklogConfig | null): Promise<boolean> {
	const editor = resolveEditor(config);

	try {
		// Split the editor command in case it has arguments
		const parts = editor.split(" ");
		const command = parts[0] ?? editor;
		const args = [...parts.slice(1), filePath];

		// Use Bun.spawn with explicit stdio inheritance for interactive editors
		// Interactive editors like vim/neovim require direct access to stdin/stdout/stderr
		// to properly render their UI and receive user input
		const subprocess = Bun.spawn([command, ...args], {
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});

		const exitCode = await subprocess.exited;
		return exitCode === 0;
	} catch (error) {
		console.error(`Failed to open editor: ${error}`);
		return false;
	}
}
