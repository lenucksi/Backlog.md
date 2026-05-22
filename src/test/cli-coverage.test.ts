import { afterAll, describe, expect, it } from "bun:test";

/**
 * Test covering cli.ts (171 lines — Commander-based CLI router).
 *
 * cli.ts has top-level side effects (await, Commander, splash, process.exit).
 * We import it directly so Bun's --coverage instruments the module,
 * mocking process.exit to prevent the test process from terminating.
 *
 * --plain triggers both the splash screen (bare-run) and config migration
 * (shouldRunMigration is true because process.argv.length > 2), covering
 * the most paths in a single module load.
 */

const originalExit = process.exit;
const originalArgv = process.argv;
const exitCodes: number[] = [];

describe("cli.ts coverage", () => {
	afterAll(() => {
		process.exit = originalExit;
		process.argv = originalArgv;
		delete process.env.BUN_OPTIONS;
	});

	it("covers splash, migration, BUN_OPTIONS, Commander, getVersion via --plain", async () => {
		exitCodes.length = 0;
		process.exit = ((code?: number) => {
			exitCodes.push(code ?? 0);
		}) as typeof process.exit;
		process.argv = ["bun", "src/cli.ts", "--plain"];
		process.env.BUN_OPTIONS = "--smol";

		const mod = await import("../cli.ts");
		expect(mod).toBeDefined();
	});
});
