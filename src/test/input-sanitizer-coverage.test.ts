import { describe, expect, it, spyOn } from "bun:test";
import { escapeBackticks, hasBacktickInjection, warnShellInjection } from "../utils/input-sanitizer.ts";

describe("hasBacktickInjection", () => {
	it("returns true when input contains backticks", () => {
		expect(hasBacktickInjection("`echo hello`")).toBe(true);
	});

	it("returns false when input has no backticks", () => {
		expect(hasBacktickInjection("hello world")).toBe(false);
	});

	it("returns false for an empty string", () => {
		expect(hasBacktickInjection("")).toBe(false);
	});
});

describe("escapeBackticks", () => {
	it("escapes backticks in a string", () => {
		expect(escapeBackticks("`echo hello`")).toBe("\\`echo hello\\`");
	});

	it("returns the original string when no backticks present", () => {
		expect(escapeBackticks("hello world")).toBe("hello world");
	});

	it("returns an empty string unchanged", () => {
		expect(escapeBackticks("")).toBe("");
	});

	it("escapes multiple backticks", () => {
		expect(escapeBackticks("a`b`c")).toBe("a\\`b\\`c");
	});
});

describe("warnShellInjection", () => {
	it("warns when input contains backticks", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			warnShellInjection("`rm -rf /`", "title");
			expect(warn).toHaveBeenCalledTimes(2);
		} finally {
			warn.mockRestore();
		}
	});

	it("does not warn when input has no backticks", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		try {
			warnShellInjection("safe title", "title");
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});
