// SELFTEST: Dieser Test FAILT initial — Ruft evaluate() mit falschem Tool-Namen auf.
// LLM soll guard-core.ts lesen, den korrekten Tool-Namen finden und den Test fixen.

import { describe, expect, it } from "bun:test"
import { join } from "path"
import { evaluate, type GuardConfig } from "../../../hooks/backlog-guard/guard-core.ts"
import { mkdtempSync } from "node:fs"

describe("backlog-guard selfhealing", () => {
	it("blocks Read on task file and suggests MCP/CLI alternative", () => {
		const tmpDir = mkdtempSync(join("tmp", "selfheal-guard-"))
		const tasksDir = join(tmpDir, "backlog", "tasks")
		Bun.spawnSync(["mkdir", "-p", tasksDir])
		Bun.spawnSync(["touch", join(tasksDir, "back-42-test.md")])

		const config: GuardConfig = {
			dirs: [join(tmpDir, "backlog")],
			configSource: "test",
		}

		// BUG: Falscher Tool-Name — "reed" statt "Read"
		const result = evaluate({ tool: "reed", filePath: join(tasksDir, "back-42-test.md") }, config)

		expect(result.blocked).toBe(true)
		expect(result.errorMessage).toContain("backlog_task_view")
		expect(result.errorMessage).toContain("mcp__backlog__task_view")
	})
})
