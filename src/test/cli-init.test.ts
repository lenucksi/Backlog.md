import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { addAgentInstructions, Core, isGitRepository } from "../index.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

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
			const result = await runBacklogCli(["init", "TestProj", "--defaults", "--agent-instructions", "none"], TEST_DIR);
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			expect(agentsFile).toBe(false);
			expect(claudeFile).toBe(false);
			expect(result.stdout).toContain("AI Integration: CLI commands (legacy)");
			expect(result.stdout).toContain("Skipping agent instruction files per selection.");
		});

		// CLI-CONTRACT: verify printed summary format
		it("should print minimal summary when advanced settings are skipped", async () => {
			await setupGit();
			const result = await runBacklogCli(
				["init", "SummaryProj", "--defaults", "--agent-instructions", "none"],
				TEST_DIR,
			);
			expect(result.stdout).toContain("Initialization Summary");
			expect(result.stdout).toContain("Project Name: SummaryProj");
			expect(result.stdout).toContain("AI Integration: CLI commands (legacy)");
			expect(result.stdout).toContain("Advanced settings: unchanged");
			expect(result.stdout).not.toContain("Remote operations:");
			expect(result.stdout).not.toContain("Zero-padded IDs:");
		});

		// CLI-CONTRACT: verify --integration-mode mcp output format
		it("should support MCP integration mode via flag", async () => {
			await setupGit();
			const result = await runBacklogCli(["init", "McpProj", "--defaults", "--integration-mode", "mcp"], TEST_DIR);
			expect(result.stdout).toContain("AI Integration: MCP connector");
			expect(result.stdout).toContain("Agent instruction files: guidance is provided through the MCP connector.");
			expect(result.stdout).toContain("MCP server name: backlog");
			expect(result.stdout).toContain("MCP client setup: skipped (non-interactive)");
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			expect(agentsFile).toBe(false);
			expect(claudeFile).toBe(false);
		});

		// CLI-CONTRACT: verify default integration mode output
		it("should default to MCP integration when no mode is specified", async () => {
			await setupGit();
			const result = await runBacklogCli(["init", "DefaultMcpProj", "--defaults"], TEST_DIR);
			expect(result.stdout).toContain("AI Integration: MCP connector");
			expect(result.stdout).toContain("MCP server name: backlog");
			expect(result.stdout).toContain("MCP client setup: skipped (non-interactive)");
		});

		// CLI-CONTRACT: verify --integration-mode none output
		it("should allow skipping AI integration via flag", async () => {
			await setupGit();
			const result = await runBacklogCli(["init", "SkipProj", "--defaults", "--integration-mode", "none"], TEST_DIR);
			expect(result.stdout).not.toContain("AI Integration:");
			expect(result.stdout).toContain("AI integration: skipped");
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			const claudeFile = await Bun.file(join(TEST_DIR, "CLAUDE.md")).exists();
			expect(agentsFile).toBe(false);
			expect(claudeFile).toBe(false);
		});

		// CLI-CONTRACT: verify --backlog-dir hidden directory behavior
		it("should support non-interactive .backlog selection via --backlog-dir", async () => {
			await setupGit();
			const result = await runBacklogCli(
				["init", "HiddenProj", "--defaults", "--integration-mode", "none", "--backlog-dir", ".backlog"],
				TEST_DIR,
			);
			expect(result.stdout).toContain("Backlog directory: .backlog");
			expect(await Bun.file(join(TEST_DIR, ".backlog", "config.yml")).exists()).toBe(true);
			expect(await Bun.file(join(TEST_DIR, "backlog", "config.yml")).exists()).toBe(false);
		});

		// CLI-CONTRACT: verify custom backlog directory with config file
		it("should store custom non-interactive backlog dir in root backlog.config.yml", async () => {
			await setupGit();
			const result = await runBacklogCli(
				["init", "CustomProj", "--defaults", "--integration-mode", "none", "--backlog-dir", "planning/backlog-data"],
				TEST_DIR,
			);
			expect(result.stdout).toContain("Backlog directory: planning/backlog-data");
			expect(result.stdout).toContain("Config location: backlog.config.yml");
			expect(await Bun.file(join(TEST_DIR, "backlog.config.yml")).exists()).toBe(true);
			const rootConfig = await Bun.file(join(TEST_DIR, "backlog.config.yml")).text();
			expect(rootConfig).toContain("backlog_directory: planning/backlog-data");
		});

		// CLI-CONTRACT: verify error output for invalid --backlog-dir
		it("should reject invalid --backlog-dir values", async () => {
			await setupGit();
			const result = await runBacklogCli(
				["init", "InvalidDirProj", "--defaults", "--integration-mode", "none", "--backlog-dir", "../outside"],
				TEST_DIR,
			);
			const output = result.stdout + result.stderr;
			expect(result.exitCode).toBe(1);
			expect(output).toContain("Invalid --backlog-dir value");
		});

		// CLI-CONTRACT: verify error on --backlog-dir re-init
		it("should reject --backlog-dir during re-initialization", async () => {
			await setupGit();
			await runBacklogCli(["init", "ReinitProj", "--defaults", "--integration-mode", "none"], TEST_DIR);
			const result = await runBacklogCli(
				["init", "ReinitProj", "--defaults", "--integration-mode", "none", "--backlog-dir", ".backlog"],
				TEST_DIR,
			);
			const output = result.stdout + result.stderr;
			expect(result.exitCode).toBe(1);
			expect(output).toContain("fixed after initialization");
		});

		// CLI-CONTRACT: verify error output for conflicting flags
		it("should reject MCP integration when agent instruction flags are provided", async () => {
			await setupGit();
			const result = await runBacklogCli(
				["init", "ConflictProj", "--defaults", "--integration-mode", "mcp", "--agent-instructions", "claude"],
				TEST_DIR,
			);
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr + result.stdout).toContain("cannot be combined");
		});

		it("should ignore 'none' when other agent instructions are provided", async () => {
			await setupGit();
			await runBacklogCli(["init", "TestProj", "--defaults", "--agent-instructions", "agents,none"], TEST_DIR);
			const agentsFile = await Bun.file(join(TEST_DIR, "AGENTS.md")).exists();
			expect(agentsFile).toBe(true);
		});

		// CLI-CONTRACT: verify error output for invalid agent instruction value
		it("should error on invalid agent instruction value", async () => {
			await setupGit();
			const result = await runBacklogCli(
				["init", "InvalidProj", "--defaults", "--agent-instructions", "notreal"],
				TEST_DIR,
			);
			expect(result.exitCode).not.toBe(0);
			const out = result.stdout + result.stderr;
			expect(out).toContain("Invalid agent instruction: notreal");
			expect(out).toContain("Valid options are: cursor, claude, agents, gemini, copilot, none");
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
