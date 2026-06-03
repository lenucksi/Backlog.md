import { afterEach, describe, expect, it } from "bun:test";
import type { BacklogConfig } from "../types/index.ts";
import { getPlatformDefaultEditor, isEditorAvailable, openInEditor, resolveEditor } from "../utils/editor.ts";

describe("getPlatformDefaultEditor", () => {
	it("returns 'notepad' for win32", () => {
		expect(getPlatformDefaultEditor("win32")).toBe("notepad");
	});

	it("returns 'nano' for darwin", () => {
		expect(getPlatformDefaultEditor("darwin")).toBe("nano");
	});

	it("returns 'nano' for linux", () => {
		expect(getPlatformDefaultEditor("linux")).toBe("nano");
	});

	it("returns 'vi' for unknown platforms", () => {
		expect(getPlatformDefaultEditor("sunos")).toBe("vi");
		expect(getPlatformDefaultEditor("freebsd")).toBe("vi");
	});
});

describe("resolveEditor", () => {
	const originalEditor = process.env.EDITOR;

	afterEach(() => {
		process.env.EDITOR = originalEditor;
	});

	it("returns EDITOR env var when set", () => {
		process.env.EDITOR = "/usr/bin/vim";
		expect(resolveEditor()).toBe("/usr/bin/vim");
	});

	it("falls back to config.defaultEditor when EDITOR is not set", () => {
		delete process.env.EDITOR;
		const config = { defaultEditor: "code" } as Partial<BacklogConfig>;
		expect(resolveEditor(config as BacklogConfig)).toBe("code");
	});

	it("falls back to platform default when nothing is configured", () => {
		delete process.env.EDITOR;
		const result = resolveEditor(null);
		expect(["nano", "vi", "notepad"]).toContain(result);
	});

	it("falls back to platform default when config is undefined", () => {
		delete process.env.EDITOR;
		const result = resolveEditor();
		expect(["nano", "vi", "notepad"]).toContain(result);
	});

	it("favors EDITOR env over config.defaultEditor", () => {
		process.env.EDITOR = "emacs";
		const config = { defaultEditor: "code" } as Partial<BacklogConfig>;
		expect(resolveEditor(config as BacklogConfig)).toBe("emacs");
	});

	it("falls back to platform default when config.defaultEditor is empty", () => {
		delete process.env.EDITOR;
		const config = { defaultEditor: "" } as Partial<BacklogConfig>;
		const result = resolveEditor(config as BacklogConfig);
		expect(["nano", "vi", "notepad"]).toContain(result);
	});
});

describe("isEditorAvailable", () => {
	it("returns true for a known executable on unix", async () => {
		const result = await isEditorAvailable("true", "linux");
		expect(result).toBe(true);
	});

	it("returns false for a non-existent executable on unix", async () => {
		const result = await isEditorAvailable("nonexistent-xyz-999", "linux");
		expect(result).toBe(false);
	});

	it("discovers platform automatically when os is not specified", async () => {
		const result = await isEditorAvailable("true");
		expect(result).toBe(true);
	});

	it("handles editor command with arguments on unix", async () => {
		const result = await isEditorAvailable("true --some-arg", "linux");
		expect(result).toBe(true);
	});

	it("returns false for non-existent command on win32", async () => {
		const result = await isEditorAvailable("nonexistent-xyz-999", "win32");
		expect(result).toBe(false);
	});
});

describe("openInEditor", () => {
	const itIfNoop = process.platform === "win32" ? it.skip : it;
	itIfNoop("returns true when editor exits successfully", async () => {
		const config = { defaultEditor: "true" } as Partial<BacklogConfig>;
		const result = await openInEditor("/dev/null", config as BacklogConfig);
		expect(result).toBe(true);
	});

	it("returns false when editor command does not exist", async () => {
		const config = { defaultEditor: "nonexistent-editor-xyz-999" } as Partial<BacklogConfig>;
		const result = await openInEditor("/dev/null", config as BacklogConfig);
		expect(result).toBe(false);
	});
});
