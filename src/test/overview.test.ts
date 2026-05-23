import { describe, expect, it } from "bun:test";
import { formatTime } from "../commands/overview.ts";

describe("formatTime", () => {
	it("returns ms for values under 1000", () => {
		expect(formatTime(0)).toBe("0ms");
		expect(formatTime(500)).toBe("500ms");
		expect(formatTime(999)).toBe("999ms");
	});

	it("returns seconds for values 1000 and above", () => {
		expect(formatTime(1000)).toBe("1.0s");
		expect(formatTime(1500)).toBe("1.5s");
		expect(formatTime(10000)).toBe("10.0s");
	});

	it("rounds ms values correctly", () => {
		expect(formatTime(123)).toBe("123ms");
		expect(formatTime(999.5)).toBe("1000ms");
	});

	it("formats seconds to one decimal place", () => {
		expect(formatTime(1234)).toBe("1.2s");
		expect(formatTime(1278)).toBe("1.3s");
	});
});
