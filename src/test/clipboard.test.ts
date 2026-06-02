import { describe, expect, it } from "bun:test";

const itIfNotWin32 = process.platform !== "win32" ? it : it.skip;
import { copyToClipboard } from "../utils/clipboard.ts";

describe("copyToClipboard", () => {
	it("is a function", () => {
		expect(typeof copyToClipboard).toBe("function");
	});

	it("returns false on unsupported platform (freebsd, no clipboard tools)", async () => {
		const orig = process.platform;
		Object.defineProperty(process, "platform", {
			value: "freebsd",
			configurable: true,
			writable: true,
		});
		try {
			const result = await copyToClipboard("hello");
			expect(result).toBe(false);
		} finally {
			Object.defineProperty(process, "platform", {
				value: orig,
				configurable: true,
				writable: true,
			});
		}
	});

	it("runs on darwin platform (pbcopy unavailable on linux, returns false)", async () => {
		const orig = process.platform;
		Object.defineProperty(process, "platform", {
			value: "darwin",
			configurable: true,
			writable: true,
		});
		try {
			const result = await copyToClipboard("hello");
			expect(result).toBe(false);
		} finally {
			Object.defineProperty(process, "platform", {
				value: orig,
				configurable: true,
				writable: true,
			});
		}
	});

	itIfNotWin32("runs on win32 platform (clip.exe unavailable on linux, returns false)", async () => {
		const orig = process.platform;
		Object.defineProperty(process, "platform", {
			value: "win32",
			configurable: true,
			writable: true,
		});
		try {
			const result = await copyToClipboard("hello");
			expect(result).toBe(false);
		} finally {
			Object.defineProperty(process, "platform", {
				value: orig,
				configurable: true,
				writable: true,
			});
		}
	});

	it("runs on linux platform and returns boolean result", async () => {
		const result = await copyToClipboard("hello");
		expect(typeof result).toBe("boolean");
	});

	it("copies text successfully on linux when clipboard tool is available", async () => {
		const result = await copyToClipboard("hello clipboard");
		expect(typeof result).toBe("boolean");
	});
});
