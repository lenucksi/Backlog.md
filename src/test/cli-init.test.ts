import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { addAgentInstructions, Core, isGitRepository } from "../index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
const CLI_PATH = join(process.cwd(), "src", "cli.ts");

describe("CLI Integration - init command", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-init");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {}
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {}
	});

	describe("backlog init command", () => {
	async function setupGit() {
		// INFRA: git setup
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		// INFRA: git setup
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		// INFRA: git setup
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
	}

		it("should initialize backlog project in existing git repo", async () => {
			await setupGit();
			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "CLI Test Project", true);
			const configExists = await Bun.file(join(TEST_DIR, "backlog", "config.yml")).exists();
			expect(configExists).toBe(true);
			const config = await core.filesystem.loadConfig();
			expect(config?.projectName).toBe("CLI Test Project");
			expect(config?.statuses).toEqual(["To Do", "In Progress", "Done"]);
			expect(config?.defaultStatus).toBe("To Do");
			const lastCommit = await core.gitOps.getLastCommitMessage();
			expect(lastCommit).toContain("Initialize backlog project: CLI Test Project");
		});

		it("should create all required directories", async () => {
			await setupGit();
			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Directory Test");
			const expectedDirs = [
				"backlog",
				"backlog/tasks",
				"backlog/drafts",
				"backlog/archive",
				"backlog/archive/tasks",
				"backlog/archive/drafts",
				"backlog/archive/milestones",
				"backlog/milestones",
				"backlog/docs",
				"backlog/decisions",
			];
			for (const dir of expectedDirs) {
				try {
					const stats = await stat(join(TEST_DIR, dir));
					expect(stats.isDirectory()).toBe(true);
				} catch {
					expect(false).toBe(true);
				}
			}
		});

		it("should handle project names with special characters", async () => {
			await setupGit();
			const core = new Core(TEST_DIR);
			const specialProjectName = "My-Project_2024 (v1.0)";
			await initializeTestProject(core, specialProjectName);
			const config = await core.filesystem.loadConfig();
			expect(config?.projectName).toBe(specialProjectName);
		});

		it("should work when git repo exists", async () => {
			await setupGit();
			const isRepo = await isGitRepository(TEST_DIR);
			expect(isRepo).toBe(true);
			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Existing Repo Test");
			const config = await core.filesystem.loadConfig();
			expect(config?.projectName).toBe("Existing Repo Test");
		});

		it("should accept optional project name parameter", async () => {
			await setupGit();
			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Test Project");
			const config = await core.filesystem.loadConfig();
			expect(config?.projectName).toBe("Test Project");
		});

		it("should create agent instruction files when requested", async () => {
			await setupGit();
			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Agent Test Project");
			await addAgentInstructions(TEST_DIR, core.gitOps);
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			const geminiFile = await Bun.file(join(TEST_DIR, "GEMINI.md")).exists();
			const copilotFile = await Bun.file(join(TEST_DIR, ".github/copilot-instructions.md")).exists();
			expect(agentsFile).toBe(true);
			expect(claudeFile).toBe(true);
			expect(geminiFile).toBe(true);
			expect(copilotFile).toBe(true);
			const agentsContent = await Bun.file(join(TEST_DIR, "AGENTS.md")).text();
			const claudeContent = await Bun.file(join(TEST_DIR, "CLAUDE.md")).text();
			const geminiContent = await Bun.file(join(TEST_DIR, "GEMINI.md")).text();
			const copilotContent = await Bun.file(join(TEST_DIR, ".github/copilot-instructions.md")).text();
			expect(agentsContent.length).toBeGreaterThan(0);
			expect(claudeContent.length).toBeGreaterThan(0);
			expect(geminiContent.length).toBeGreaterThan(0);
			expect(copilotContent.length).toBeGreaterThan(0);
		});

		// CLI-CONTRACT: verify --agent-instructions none skips instruction files
		it("should allow skipping agent instructions with 'none' selection", async () => {
			await setupGit();
			const output = await $`bun ${CLI_PATH} init TestProj --defaults --agent-instructions none`.cwd(TEST_DIR).text();
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			expect(agentsFile).toBe(false);
			expect(claudeFile).toBe(false);
			expect(output).toContain("AI Integration: CLI commands (legacy)");
			expect(output).toContain("Skipping agent instruction files per selection.");
		});

		// CLI-CONTRACT: verify printed summary format
		it("should print minimal summary when advanced settings are skipped", async () => {
			await setupGit();
			const output = await $`bun ${CLI_PATH} init SummaryProj --defaults --agent-instructions none`
				.cwd(TEST_DIR)
				.text();
			expect(output).toContain("Initialization Summary");
			expect(output).toContain("Project Name: SummaryProj");
			expect(output).toContain("AI Integration: CLI commands (legacy)");
			expect(output).toContain("Advanced settings: unchanged");
			expect(output).not.toContain("Remote operations:");
			expect(output).not.toContain("Zero-padded IDs:");
		});

		// CLI-CONTRACT: verify --integration-mode mcp output format
		it("should support MCP integration mode via flag", async () => {
			await setupGit();
			const output = await $`bun ${CLI_PATH} init McpProj --defaults --integration-mode mcp`.cwd(TEST_DIR).text();
			expect(output).toContain("AI Integration: MCP connector");
			expect(output).toContain("Agent instruction files: guidance is provided through the MCP connector.");
			expect(output).toContain("MCP server name: backlog");
			expect(output).toContain("MCP client setup: skipped (non-interactive)");
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			expect(agentsFile).toBe(false);
			expect(claudeFile).toBe(false);
		});

		// CLI-CONTRACT: verify default integration mode output
		it("should default to MCP integration when no mode is specified", async () => {
			await setupGit();
			const output = await $`bun ${CLI_PATH} init DefaultMcpProj --defaults`.cwd(TEST_DIR).text();
			expect(output).toContain("AI Integration: MCP connector");
			expect(output).toContain("MCP server name: backlog");
			expect(output).toContain("MCP client setup: skipped (non-interactive)");
		});

		// CLI-CONTRACT: verify --integration-mode none output
		it("should allow skipping AI integration via flag", async () => {
			await setupGit();
			const output = await $`bun ${CLI_PATH} init SkipProj --defaults --integration-mode none`.cwd(TEST_DIR).text();
			expect(output).not.toContain("AI Integration:");
			expect(output).toContain("AI integration: skipped");
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			expect(agentsFile).toBe(false);
			expect(claudeFile).toBe(false);
		});

		// CLI-CONTRACT: verify --backlog-dir hidden directory behavior
		it("should support non-interactive .backlog selection via --backlog-dir", async () => {
			await setupGit();
			const output = await $`bun ${CLI_PATH} init HiddenProj --defaults --integration-mode none --backlog-dir .backlog`
				.cwd(TEST_DIR)
				.text();
			expect(output).toContain("Backlog directory: .backlog");
			expect(await Bun.file(join(TEST_DIR, ".backlog", "config.yml")).exists()).toBe(true);
			expect(await Bun.file(join(TEST_DIR, "backlog", "config.yml")).exists()).toBe(false);
		});

		// CLI-CONTRACT: verify custom backlog directory with config file
		it("should store custom non-interactive backlog dir in root backlog.config.yml", async () => {
			await setupGit();
			const output =
				await $`bun ${CLI_PATH} init CustomProj --defaults --integration-mode none --backlog-dir planning/backlog-data`
					.cwd(TEST_DIR)
					.text();
			expect(output).toContain("Backlog directory: planning/backlog-data");
			expect(output).toContain("Config location: backlog.config.yml");
			expect(await Bun.file(join(TEST_DIR, "backlog.config.yml")).exists()).toBe(true);
			const rootConfig = await Bun.file(join(TEST_DIR, "backlog.config.yml")).text();
			expect(rootConfig).toContain("backlog_directory: planning/backlog-data");
		});

		// CLI-CONTRACT: verify error output for invalid --backlog-dir
		it("should reject invalid --backlog-dir values", async () => {
			await setupGit();
			const result =
				await $`bun ${CLI_PATH} init InvalidDirProj --defaults --integration-mode none --backlog-dir ../outside`
					.cwd(TEST_DIR)
					.nothrow();
			const output = result.stdout.toString() + result.stderr.toString();
			expect(result.exitCode).toBe(1);
			expect(output).toContain("Invalid --backlog-dir value");
		});

		// CLI-CONTRACT: verify error on --backlog-dir re-init
		it("should reject --backlog-dir during re-initialization", async () => {
			await setupGit();
			await $`bun ${CLI_PATH} init ReinitProj --defaults --integration-mode none`.cwd(TEST_DIR).quiet();
			const result = await $`bun ${CLI_PATH} init ReinitProj --defaults --integration-mode none --backlog-dir .backlog`
				.cwd(TEST_DIR)
				.nothrow();
			const output = result.stdout.toString() + result.stderr.toString();
			expect(result.exitCode).toBe(1);
			expect(output).toContain("fixed after initialization");
		});

		// CLI-CONTRACT: verify error output for conflicting flags
		it("should reject MCP integration when agent instruction flags are provided", async () => {
			await setupGit();
			let failed = false;
			let combinedOutput = "";
			try {
				await $`bun ${CLI_PATH} init ConflictProj --defaults --integration-mode mcp --agent-instructions claude`
					.cwd(TEST_DIR)
					.text();
			} catch (err) {
				failed = true;
				const e = err as { stdout?: unknown; stderr?: unknown };
				combinedOutput = String(e.stdout ?? "") + String(e.stderr ?? "");
			}
			expect(failed).toBe(true);
			expect(combinedOutput).toContain("cannot be combined");
		});

		it("should ignore 'none' when other agent instructions are provided", async () => {
			await setupGit();
			await $`bun ${CLI_PATH} init TestProj --defaults --agent-instructions agents,none`.cwd(TEST_DIR).quiet();
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			expect(agentsFile).toBe(true);
		});

		// CLI-CONTRACT: verify error output for invalid agent instruction value
		it("should error on invalid agent instruction value", async () => {
			await setupGit();
			let failed = false;
			try {
				await $`bun ${CLI_PATH} init InvalidProj --defaults --agent-instructions notreal`.cwd(TEST_DIR).quiet();
			} catch (e) {
				failed = true;
				const err = e as { stdout?: unknown; stderr?: unknown };
				const out = String(err.stdout ?? "") + String(err.stderr ?? "");
				expect(out).toContain("Invalid agent instruction: notreal");
				expect(out).toContain("Valid options are: cursor, claude, agents, gemini, copilot, none");
			}
			expect(failed).toBe(true);
		});
	});

	describe("git integration", () => {
		beforeEach(async () => {
			await $`git init -b main`.cwd(TEST_DIR).quiet();
			await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
			await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
		});

		it("should create initial commit with backlog structure", async () => {
			const core = new Core(TEST_DIR);
			await initializeTestProject(core, "Git Integration Test", true);
			const lastCommit = await core.gitOps.getLastCommitMessage();
			expect(lastCommit).toBe("backlog: Initialize backlog project: Git Integration Test");
			const isClean = await core.gitOps.isClean();
			expect(isClean).toBe(true);
		});
	});
});
