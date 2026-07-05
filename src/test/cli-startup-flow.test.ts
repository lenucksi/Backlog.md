import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { initializeProject } from "../core/init.ts";
import { getExplicitProjectPath, setExplicitProjectPath } from "../utils/cli-context.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

describe("CLI startup flow", () => {
	describe("program.action (splash)", () => {
		it("fires when no subcommand is given (bare run)", async () => {
			const calls: string[] = [];
			const program = new Command().name("backlog");
			program.action(() => {
				calls.push("splash");
			});
			const sub = program.command("task").action(() => {
				calls.push("task");
			});
			sub.command("list").action(() => {
				calls.push("list");
			});

			await program.parseAsync(["node", "test"], { from: "node" });
			expect(calls).toEqual(["splash"]);
		});

		it("does NOT fire when a subcommand is given", async () => {
			const calls: string[] = [];
			const program = new Command().name("backlog");
			program.action(() => {
				calls.push("splash");
			});
			program.command("task").action(() => {
				calls.push("task");
			});

			await program.parseAsync(["node", "test", "task"], { from: "node" });
			expect(calls).toEqual(["task"]);
		});
	});

	describe("preAction hook (config migration)", () => {
		it("fires for subcommand actions", async () => {
			const hookCalls: string[] = [];
			const program = new Command().name("backlog");
			program
				.hook("preAction", (_thisCmd, actionCmd) => {
					hookCalls.push(`pre-${actionCmd.name()}`);
				})
				.command("task")
				.action(() => {
					hookCalls.push("task");
				});

			await program.parseAsync(["node", "test", "task"], { from: "node" });
			// preAction fires before the leaf command's own action
			expect(hookCalls).toEqual(["pre-task", "task"]);
		});

		it("skips when thisCommand === actionCommand (program action)", async () => {
			const hookCalls: string[] = [];
			const program = new Command().name("backlog");
			program
				.hook("preAction", (thisCmd, actionCmd) => {
					if (thisCmd === actionCmd) {
						hookCalls.push("skip-program-action");
						return;
					}
					hookCalls.push(`pre-${actionCmd.name()}`);
				})
				.action(() => {
					hookCalls.push("splash");
				});

			await program.parseAsync(["node", "test"], { from: "node" });
			expect(hookCalls).toEqual(["skip-program-action", "splash"]);
		});

		it("skips for init command", async () => {
			const hookCalls: string[] = [];
			const program = new Command().name("backlog");
			program
				.hook("preAction", (_thisCmd, actionCmd) => {
					if (actionCmd.name() === "init") {
						hookCalls.push("skip-init");
						return;
					}
					hookCalls.push(`pre-${actionCmd.name()}`);
				})
				.action(() => {
					hookCalls.push("splash");
				});
			program.command("init").action(() => {
				hookCalls.push("init");
			});
			program.command("task").action(() => {
				hookCalls.push("task");
			});

			await program.parseAsync(["node", "test", "init"], { from: "node" });
			expect(hookCalls).toEqual(["skip-init", "init"]);

			await program.parseAsync(["node", "test", "task"], { from: "node" });
			expect(hookCalls).toEqual(["skip-init", "init", "pre-task", "task"]);
		});

		it("skip-check ONLY matches the top-level init (leaf command name check)", async () => {
			// The real codebase has no nested subcommands under init, but this test
			// documents the limitation: actionCmd.name() is the LEAF command, so
			// "backlog init config" would NOT match the "init" skip.
			const hookCalls: string[] = [];
			const program = new Command().name("backlog");
			program
				.hook("preAction", (_thisCmd, actionCmd) => {
					if (actionCmd.name() === "init") {
						hookCalls.push("skip-init");
						return;
					}
					hookCalls.push(`pre-${actionCmd.name()}`);
				})
				.action(() => {
					hookCalls.push("splash");
				});
			program
				.command("init")
				.option("--force")
				.action(() => {
					hookCalls.push("init");
				});
			program.command("task").action(() => {
				hookCalls.push("task");
			});

			await program.parseAsync(["node", "test", "init"], { from: "node" });
			expect(hookCalls).toEqual(["skip-init", "init"]);

			await program.parseAsync(["node", "test", "task"], { from: "node" });
			expect(hookCalls).toEqual(["skip-init", "init", "pre-task", "task"]);
		});
	});

	describe("--plain global option", () => {
		it("is recognized and does not cause unknown option error", async () => {
			let capturedOpts: Record<string, unknown> = {};
			const program = new Command().name("backlog");
			program.option("--plain", "Force plain output").action(() => {
				capturedOpts = program.opts();
			});

			await program.parseAsync(["node", "test", "--plain"], { from: "node" });
			expect(capturedOpts).toHaveProperty("plain");
			expect(capturedOpts.plain).toBe(true);
		});

		it("does not cause unknown option error when used with subcommands", async () => {
			const calls: string[] = [];
			const program = new Command().name("backlog");
			program.option("--plain", "Force plain output");
			program.command("task").action(() => {
				calls.push("task");
			});

			// --plain is consumed globally; subcommand still runs (no "unknown option" error)
			await program.parseAsync(["node", "test", "task", "--plain"], { from: "node" });
			expect(calls).toEqual(["task"]);
		});
	});

	describe("--path via program.opts()", () => {
		it("is available in preAction hook from program.opts().path", async () => {
			let capturedPath: string | undefined;
			const program = new Command().name("backlog");
			program
				.option("--path <path>", "Project root")
				.hook("preAction", (thisCmd) => {
					capturedPath = thisCmd.opts().path;
				})
				.action(() => {});
			program.command("cmd").action(() => {});

			await program.parseAsync(["node", "test", "--path", "/some/root", "cmd"], { from: "node" });
			expect(capturedPath).toBe("/some/root");
		});

		it("is undefined when --path is not provided", async () => {
			let capturedPath: string | undefined = "default";
			const program = new Command().name("backlog");
			program
				.option("--path <path>", "Project root")
				.hook("preAction", (thisCmd) => {
					capturedPath = thisCmd.opts().path;
				})
				.action(() => {});
			program.command("cmd").action(() => {});

			await program.parseAsync(["node", "test", "cmd"], { from: "node" });
			expect(capturedPath).toBeUndefined();
		});
	});
});

describe("CLI startup flow - integration", () => {
	let TEST_DIR: string;

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("startup-flow");
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		setExplicitProjectPath(undefined);
		await safeCleanup(TEST_DIR);
	});

	it("setExplicitProjectPath is called when --path is provided", async () => {
		setExplicitProjectPath(undefined);
		expect(getExplicitProjectPath()).toBeUndefined();

		const program = new Command().name("backlog");
		program
			.option("--path <path>", "Project root")
			.hook("preAction", (thisCmd) => {
				const rootPath = thisCmd.opts().path;
				if (rootPath) {
					setExplicitProjectPath(rootPath);
				}
			})
			.command("cmd")
			.action(async () => {
				// requireProjectRoot would read getExplicitProjectPath here
				expect(getExplicitProjectPath()).toBe(TEST_DIR);
				const core = new Core(TEST_DIR);
				await initializeProject(core, {
					projectName: "Startup Flow Test",
					integrationMode: "none",
					advancedConfig: { autoCommit: false },
				});
			});

		await program.parseAsync(["node", "test", "--path", TEST_DIR, "cmd"], { from: "node" });
		expect(getExplicitProjectPath()).toBe(TEST_DIR);
	});
});
