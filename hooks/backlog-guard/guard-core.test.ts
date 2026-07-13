import { describe, test, expect, beforeEach } from "bun:test"
import { join } from "path"
import {
	clearConfigCache,
	loadConfig,
	isProtected,
	extractTaskId,
	classifyPath,
	bashTargetsProtected,
	evaluate,
	type GuardConfig,
} from "./guard-core"

let tmpDir: string
let guardConfig: GuardConfig

beforeEach(async () => {
	clearConfigCache()
	tmpDir = Bun.spawnSync(["mktemp", "-d"]).stdout.toString().trim()

	const backlog = join(tmpDir, "backlog")
	Bun.spawnSync(["mkdir", "-p", join(backlog, "tasks")])
	Bun.spawnSync(["mkdir", "-p", join(backlog, "docs")])
	await Bun.write(join(backlog, "config.yml"), "project: test\n")
	await Bun.write(join(tmpDir, ".backlog-guard"), "dirs:\n  - backlog/\n")

	guardConfig = {
		dirs: [join(tmpDir, "backlog")],
		configSource: join(tmpDir, ".backlog-guard"),
	}
})

async function mkTaskFile(name: string): Promise<string> {
	const p = join(tmpDir, "backlog", "tasks", name)
	await Bun.write(p, "# Task\n")
	return p
}

async function mkDocFile(name: string): Promise<string> {
	const p = join(tmpDir, "backlog", "docs", name)
	await Bun.write(p, "# Doc\n")
	return p
}

// -- Config discovery ---------------------------------------------------------

describe("loadConfig", () => {
	test("finds .backlog-guard from cwd", () => {
		const cfg = loadConfig(tmpDir)
		expect(cfg).not.toBeNull()
		expect(cfg!.dirs).toHaveLength(1)
		expect(cfg!.dirs[0]).toBe(join(tmpDir, "backlog"))
	})

	test("auto-detects via backlog/config.yml", () => {
		clearConfigCache()
		Bun.spawnSync(["rm", "-rf", join(tmpDir, ".backlog-guard")])

		const cfg = loadConfig(tmpDir)
		expect(cfg).not.toBeNull()
		expect(cfg!.dirs).toHaveLength(1)
		expect(cfg!.configSource).toBe("auto-detected")
	})

	test("returns null for non-backlog project", () => {
		clearConfigCache()
		Bun.spawnSync(["rm", "-rf", join(tmpDir, ".backlog-guard")])
		Bun.spawnSync(["rm", "-rf", join(tmpDir, "backlog", "config.yml")])

		const cfg = loadConfig(tmpDir)
		expect(cfg).toBeNull()
	})
})

// -- Path protection ----------------------------------------------------------

describe("isProtected", () => {
	test("matches file inside protected dir", async () => {
		const p = await mkTaskFile("back-123 - Test.md")
		expect(isProtected(p, guardConfig.dirs)).toBe(join(tmpDir, "backlog"))
	})

	test("returns null for file outside protected dir", async () => {
		const src = join(tmpDir, "src", "main.ts")
		Bun.spawnSync(["mkdir", "-p", join(tmpDir, "src")])
		await Bun.write(src, "const x = 1;\n")
		expect(isProtected(src, guardConfig.dirs)).toBeNull()
	})
})

// -- Task ID extraction -------------------------------------------------------

describe("extractTaskId", () => {
	test("extracts BACK-123 from filename", () => {
		expect(extractTaskId("back-123 - Feature.md")).toBe("BACK-123")
	})

	test("case insensitive", () => {
		expect(extractTaskId("BACK-456 - urgent.md")).toBe("BACK-456")
	})

	test("returns null when no ID", () => {
		expect(extractTaskId("readme.md")).toBeNull()
	})
})

// -- Path classification ------------------------------------------------------

describe("classifyPath", () => {
	test("task path", () => {
		expect(classifyPath(join("backlog", "tasks", "back-1.md"))).toBe("task")
	})

	test("doc path", () => {
		expect(classifyPath(join("backlog", "docs", "arch.md"))).toBe("doc")
	})

	test("decision path", () => {
		expect(classifyPath(join("backlog", "decisions", "adr-001.md"))).toBe("decision")
	})

	test("milestone path", () => {
		expect(classifyPath(join("backlog", "milestones", "m-1.md"))).toBe("milestone")
	})

	test("config path", () => {
		expect(classifyPath(join("backlog", "config.yml"))).toBe("config")
	})
})

// -- Bash analysis ------------------------------------------------------------

describe("bashTargetsProtected", () => {
	test("blocks cat on task file", async () => {
		const p = await mkTaskFile("back-123-title.md")
		expect(bashTargetsProtected(`cat ${p}`, guardConfig.dirs)).toBe(p.replace(/\\/g, "/"))
	})

	test("blocks grep on task directory", async () => {
		const tasksDir = join(tmpDir, "backlog", "tasks")
		expect(bashTargetsProtected(`grep -r "status" ${tasksDir}`, guardConfig.dirs)).toBe(tasksDir.replace(/\\/g, "/"))
	})

	test("does not block pipeline grep", () => {
		const name = "back-123-title.md"
		expect(bashTargetsProtected(`cat something.txt | grep ${name}`, guardConfig.dirs)).toBeNull()
	})

	test("blocks find on backlog directory", async () => {
		const backlog = join(tmpDir, "backlog")
		expect(bashTargetsProtected(`find ${backlog} -name "*.md"`, guardConfig.dirs)).toBe(backlog.replace(/\\/g, "/"))
	})
})

// -- evaluate() end-to-end ----------------------------------------------------

describe("evaluate", () => {
	test("Read on task file is blocked with BACK-123 in message", async () => {
		const p = await mkTaskFile("back-123-my-feature.md")
		const result = evaluate({ tool: "Read", filePath: p }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("BACK-123")
		expect(result.errorMessage).toContain("mcp__backlog__task_view")
		expect(result.errorMessage).toContain("backlog_task_view")
	})

	test("Read on src/ outside backlog is allowed", async () => {
		const src = join(tmpDir, "src", "main.ts")
		Bun.spawnSync(["mkdir", "-p", join(tmpDir, "src")])
		await Bun.write(src, "const x = 1;\n")
		const result = evaluate({ tool: "Read", filePath: src }, guardConfig)
		expect(result.blocked).toBe(false)
	})

	test("Bash cat on task file is blocked", async () => {
		const p = await mkTaskFile("back-123-title.md")
		const result = evaluate({ tool: "Bash", command: `cat ${p}` }, guardConfig)
		expect(result.blocked).toBe(true)
	})

	test("Edit on doc file suggests document_update", async () => {
		const p = await mkDocFile("architecture.md")
		const result = evaluate({ tool: "Edit", filePath: p }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__document_update")
		expect(result.errorMessage).toContain("backlog_document_update")
		expect(result.errorMessage).toContain('path="architecture.md"')
	})

	test("Write to new file suggests task_create", () => {
		const p = join(tmpDir, "backlog", "tasks", "new-task-draft.md")
		const result = evaluate({ tool: "Write", filePath: p }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__task_create")
		expect(result.errorMessage).toContain("backlog_task_create")
	})

	test("Grep on tasks directory is blocked with task_search suggestion", () => {
		const tasksDir = join(tmpDir, "backlog", "tasks")
		const result = evaluate(
			{ tool: "Grep", grepPath: tasksDir, grepPattern: "status" },
			guardConfig,
		)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__task_search")
	})

	test("Grep outside backlog is allowed", async () => {
		const src = join(tmpDir, "src")
		Bun.spawnSync(["mkdir", "-p", src])
		const result = evaluate(
			{ tool: "Grep", grepPath: src, grepPattern: "status" },
			guardConfig,
		)
		expect(result.blocked).toBe(false)
	})

	test("Read on decision file is blocked with search --type decision", async () => {
		const decisions = join(tmpDir, "backlog", "decisions")
		Bun.spawnSync(["mkdir", "-p", decisions])
		const adr = join(decisions, "adr-001-use-markdown.md")
		await Bun.write(adr, "# ADR 001\n")
		const result = evaluate({ tool: "Read", filePath: adr }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("--type decision")
	})

	test("Write on decision file suggests backlog decision create", async () => {
		const decisions = join(tmpDir, "backlog", "decisions")
		Bun.spawnSync(["mkdir", "-p", decisions])
		const newDecision = join(decisions, "new-architecture-choice.md")
		const result = evaluate({ tool: "Write", filePath: newDecision }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("backlog decision create")
		expect(result.errorMessage).toContain("--status proposed")
	})

	test("Read on milestone file suggests milestone_list", async () => {
		const msDir = join(tmpDir, "backlog", "milestones")
		Bun.spawnSync(["mkdir", "-p", msDir])
		const ms = join(msDir, "m-1 - release.md")
		await Bun.write(ms, "# Milestone\n")
		const result = evaluate({ tool: "Read", filePath: ms }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__milestone_list")
		expect(result.errorMessage).toContain("backlog_milestone_list")
	})

	test("Write on milestone file suggests milestone_add", async () => {
		const msDir = join(tmpDir, "backlog", "milestones")
		Bun.spawnSync(["mkdir", "-p", msDir])
		const newMs = join(msDir, "new-milestone.md")
		const result = evaluate({ tool: "Write", filePath: newMs }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__milestone_add")
		expect(result.errorMessage).toContain("backlog_milestone_add")
	})

	test("Edit on milestone file suggests milestone_rename", async () => {
		const msDir = join(tmpDir, "backlog", "milestones")
		Bun.spawnSync(["mkdir", "-p", msDir])
		const ms = join(msDir, "m-1 - release.md")
		await Bun.write(ms, "# Milestone\n")
		const result = evaluate({ tool: "Edit", filePath: ms }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__milestone_rename")
	})

	test("Grep on decisions directory suggests document_search", async () => {
		const decisionsDir = join(tmpDir, "backlog", "decisions")
		Bun.spawnSync(["mkdir", "-p", decisionsDir])
		const result = evaluate(
			{ tool: "Grep", grepPath: decisionsDir, grepPattern: "architecture" },
			guardConfig,
		)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("mcp__backlog__document_search")
	})

	test("Read on config file suggests config CLI", () => {
		const cfg = join(tmpDir, "backlog", "config.yml")
		const result = evaluate({ tool: "Read", filePath: cfg }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("backlog config get")
	})

	test("Write on config file suggests config set", () => {
		const cfg = join(tmpDir, "backlog", "config.yml")
		const result = evaluate({ tool: "Write", filePath: cfg }, guardConfig)
		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("backlog config set")
	})
})

describe("createGuardEntry (loadConfig + evaluate)", () => {
	test("no backlog project exits cleanly", async () => {
		clearConfigCache()
		const noBacklogDir = Bun.spawnSync(["mktemp", "-d"]).stdout.toString().trim()
		const { createGuardEntry } = await import("./guard-core")
		const result = createGuardEntry(
			{ tool: "Read", filePath: "/some/file.md" },
			noBacklogDir,
		)
		expect(result.blocked).toBe(false)
	})
})
