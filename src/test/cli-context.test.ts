import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getExplicitProjectPath, setExplicitProjectPath } from "../utils/cli-context.ts";

describe("setExplicitProjectPath / getExplicitProjectPath", () => {
	afterEach(() => {
		setExplicitProjectPath(undefined);
	});

	it("returns undefined when no path is set", () => {
		expect(getExplicitProjectPath()).toBeUndefined();
	});

	it("stores and retrieves a path", () => {
		setExplicitProjectPath("/tmp/test-backlog");
		expect(getExplicitProjectPath()).toBe("/tmp/test-backlog");
	});

	it("overwrites previous value", () => {
		setExplicitProjectPath("/tmp/first");
		setExplicitProjectPath("/tmp/second");
		expect(getExplicitProjectPath()).toBe("/tmp/second");
	});

	it("clears path when undefined is passed", () => {
		setExplicitProjectPath("/tmp/test");
		setExplicitProjectPath(undefined);
		expect(getExplicitProjectPath()).toBeUndefined();
	});
});
