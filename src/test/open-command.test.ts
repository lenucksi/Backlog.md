import { describe, expect, it } from "bun:test";
import { createUrlPath, sanitizeUrlTitle, stripIdPrefix } from "../utils/url-helpers.ts";

describe("URL helpers", () => {
	describe("stripIdPrefix", () => {
		it("should strip BACK- prefix from task IDs", () => {
			expect(stripIdPrefix("BACK-531")).toBe("531");
		});

		it("should strip back- prefix (lowercase)", () => {
			expect(stripIdPrefix("back-531")).toBe("531");
		});

		it("should strip doc- prefix from document IDs", () => {
			expect(stripIdPrefix("doc-007")).toBe("007");
		});

		it("should strip decision- prefix from decision IDs", () => {
			expect(stripIdPrefix("decision-003")).toBe("003");
		});
	});

	describe("sanitizeUrlTitle", () => {
		it("should convert title to URL-friendly slug", () => {
			expect(sanitizeUrlTitle("My Task Title")).toBe("my-task-title");
		});

		it("should remove special characters", () => {
			expect(sanitizeUrlTitle("Hello! @World #2024")).toBe("hello-world-2024");
		});

		it("should collapse multiple hyphens", () => {
			expect(sanitizeUrlTitle("Too   many   spaces")).toBe("too-many-spaces");
		});

		it("should trim leading/trailing hyphens", () => {
			expect(sanitizeUrlTitle("-hello-")).toBe("hello");
		});
	});

	describe("createUrlPath", () => {
		it("should create task URL path", () => {
			const result = createUrlPath("tasks", "BACK-531", "Fix login bug");
			expect(result).toBe("tasks/531/fix-login-bug");
		});

		it("should create document URL path", () => {
			const result = createUrlPath("documentation", "doc-007", "API Reference");
			expect(result).toBe("documentation/007/api-reference");
		});

		it("should create decision URL path", () => {
			const result = createUrlPath("decisions", "decision-003", "Use TypeScript");
			expect(result).toBe("decisions/003/use-typescript");
		});
	});
});
