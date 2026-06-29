import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as boardModule from "../board.ts";
import { updateReadmeWithBoard } from "../readme.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

const BOARD_CONTENT_SAMPLE = `Project: Test
Generated on: 2026-05-22 12:00:00

| To Do | In Progress | Done |
|-------|-------------|------|
| Task 1 | Task 2 | Task 3 |`;

describe("updateReadmeWithBoard", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = createUniqueTestDir("readme-test");
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await safeCleanup(testDir);
	});

	async function runUpdate(
		tasks: Parameters<typeof updateReadmeWithBoard>[0] = [],
		statuses = ["To Do", "In Progress", "Done"],
		projectName = "Test",
		version?: string,
	) {
		const exportSpy = spyOn(boardModule, "exportKanbanBoardToFile");
		exportSpy.mockImplementation(async (_tasks, _statuses, filePath, _projectName) => {
			await writeFile(filePath, BOARD_CONTENT_SAMPLE, "utf-8");
		});

		await updateReadmeWithBoard(tasks, statuses, projectName, version, testDir);

		exportSpy.mockRestore();
	}

	it("creates README with board when no README exists", async () => {
		await runUpdate();

		const content = await readFile(join(testDir, "README.md"), "utf-8");
		expect(content).toContain("<!-- BOARD_START -->");
		expect(content).toContain("<!-- BOARD_END -->");
		expect(content).toContain("Test Project Status");
		expect(content).toContain("| To Do | In Progress | Done |");
	});

	it("replaces existing board between markers", async () => {
		await writeFile(
			join(testDir, "README.md"),
			"# My Project\n\n<!-- BOARD_START -->\nold board\n<!-- BOARD_END -->\n\nFooter",
			"utf-8",
		);

		await runUpdate();

		const content = await readFile(join(testDir, "README.md"), "utf-8");
		expect(content).toContain("# My Project");
		expect(content).toContain("Test Project Status");
		expect(content).toContain("Footer");
		expect(content).not.toContain("old board");
	});

	it("inserts board before License section when no markers exist", async () => {
		await writeFile(join(testDir, "README.md"), "# My Project\n\nDescription\n\n## License\nMIT\n", "utf-8");

		await runUpdate();

		const content = await readFile(join(testDir, "README.md"), "utf-8");
		expect(content).toContain("<!-- BOARD_START -->");
		expect(content).toContain("<!-- BOARD_END -->");
		expect(content).toContain("## License\nMIT");
		expect(content.indexOf("BOARD_START")).toBeLessThan(content.indexOf("## License"));
	});

	it("includes version when provided", async () => {
		await runUpdate([], ["To Do"], "Test", "1.0.0");

		const content = await readFile(join(testDir, "README.md"), "utf-8");
		expect(content).toContain("(1.0.0)");
	});

	it("appends board at end when no markers or license section exist", async () => {
		await writeFile(join(testDir, "README.md"), "# My Project\n\nJust some text.", "utf-8");

		await runUpdate();

		const content = await readFile(join(testDir, "README.md"), "utf-8");
		expect(content).toContain("<!-- BOARD_START -->");
		const boardStartIndex = content.indexOf("<!-- BOARD_START -->");
		const textIndex = content.indexOf("Just some text.");
		expect(boardStartIndex).toBeGreaterThan(textIndex);
	});
});
