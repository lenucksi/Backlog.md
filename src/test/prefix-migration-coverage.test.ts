import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { migrateDraftPrefixes, needsDraftPrefixMigration } from "../core/prefix-migration.ts";
import type { FileSystem } from "../file-system/operations.ts";
import type { BacklogConfig, Task } from "../types/index.ts";

describe("needsDraftPrefixMigration", () => {
	it("returns false for null config", () => {
		expect(needsDraftPrefixMigration(null)).toBe(false);
	});

	it("returns true when config has no prefixes section", () => {
		const config = { projectName: "test", statuses: ["To Do"], labels: [] } as BacklogConfig;
		expect(needsDraftPrefixMigration(config)).toBe(true);
	});

	it("returns false when config already has prefixes", () => {
		const config = {
			projectName: "test",
			statuses: ["To Do"],
			labels: [],
			prefixes: { task: "task" },
		} as BacklogConfig;
		expect(needsDraftPrefixMigration(config)).toBe(false);
	});
});

function createMockFs(tempDir: string) {
	const savedDrafts: Task[] = [];
	let savedConfig: BacklogConfig | null = null;

	return {
		getDraftsDir: () => Promise.resolve(join(tempDir, "drafts")),
		listDrafts: () => Promise.resolve(savedDrafts.map((d) => ({ id: d.id }))),
		saveDraft: async (task: Task) => {
			savedDrafts.push(task);
		},
		loadConfig: () =>
			Promise.resolve({
				projectName: "test",
				statuses: ["To Do", "Done"],
				labels: [],
			} as BacklogConfig),
		saveConfig: async (config: BacklogConfig) => {
			savedConfig = config;
		},
		getSavedDrafts: () => savedDrafts,
		getSavedConfig: () => savedConfig,
		reset: () => {
			savedDrafts.length = 0;
			savedConfig = null;
		},
	};
}

describe("migrateDraftPrefixes", () => {
	let tempDir: string;
	let mockFs: ReturnType<typeof createMockFs>;

	beforeEach(async () => {
		tempDir = join(
			import.meta.dirname,
			"..",
			"..",
			"tmp",
			`prefix-migration-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		);
		await rm(tempDir, { recursive: true, force: true });
		await mkdir(tempDir, { recursive: true });
		mockFs = createMockFs(tempDir);
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("migrates when drafts dir does not exist (empty glob)", async () => {
		await migrateDraftPrefixes(mockFs as unknown as FileSystem);
		const config = mockFs.getSavedConfig();
		expect(config).not.toBeNull();
		expect(config?.prefixes).toEqual({ task: "task" });
	});

	it("migrates when drafts dir is empty (no task-*.md files)", async () => {
		const draftsDir = join(tempDir, "drafts");
		await mkdir(draftsDir, { recursive: true });
		await writeFile(join(draftsDir, "some-other-file.md"), "# unrelated");
		await migrateDraftPrefixes(mockFs as unknown as FileSystem);
		const config = mockFs.getSavedConfig();
		expect(config).not.toBeNull();
		expect(config?.prefixes).toEqual({ task: "task" });
	});

	it("migrates a single task-*.md file to draft-*", async () => {
		const draftsDir = join(tempDir, "drafts");
		await mkdir(draftsDir, { recursive: true });
		const content = `---
id: task-1
title: Old Draft
status: Draft
assignee: []
created_date: '2026-01-01'
labels: []
dependencies: []
---

Body content`;
		await writeFile(join(draftsDir, "task-1 - Old Draft.md"), content);
		await migrateDraftPrefixes(mockFs as unknown as FileSystem);
		const config = mockFs.getSavedConfig();
		expect(config?.prefixes).toEqual({ task: "task" });
		const drafts = mockFs.getSavedDrafts();
		expect(drafts.length).toBe(1);
		expect(drafts[0]?.id).toMatch(/^DRAFT-/);
		const files = await Array.fromAsync(new Bun.Glob("*.md").scan({ cwd: draftsDir, followSymlinks: true }));
		expect(files.length).toBe(0);
	});

	it("migrates multiple task-*.md files and generates sequential draft IDs", async () => {
		const draftsDir = join(tempDir, "drafts");
		await mkdir(draftsDir, { recursive: true });
		for (let i = 1; i <= 3; i++) {
			const content = `---
id: task-${i}
title: Draft ${i}
status: Draft
assignee: []
created_date: '2026-01-0${i}'
labels: []
dependencies: []
---

Body ${i}`;
			await writeFile(join(draftsDir, `task-${i} - Draft ${i}.md`), content);
		}
		await migrateDraftPrefixes(mockFs as unknown as FileSystem);
		const drafts = mockFs.getSavedDrafts();
		expect(drafts.length).toBe(3);
		expect(drafts[0]?.id).toBe("DRAFT-1");
		expect(drafts[1]?.id).toBe("DRAFT-2");
		expect(drafts[2]?.id).toBe("DRAFT-3");
	});
});
