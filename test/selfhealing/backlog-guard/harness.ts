/**
 * Self-Healing Test Harness — Backlog Guard
 *
 * Für jeden Testfall:
 * 1. Vorher: bun test → muss FAILEN
 * 2. LLM: opencode run --format=json → diagnostiziert + fixt
 * 3. Nachher: bun test → muss PASSEN
 *
 * NDJSON-Output von opencode wird geparst für:
 * - Tool-Call-Analyse (wurden LSP-Tools aufgerufen?)
 * - Cost-Tracking (Tokens, Dollar)
 * - LLM-Verdict vs. Actual-Verdict (Kalibrierung)
 */

import { execSync, spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const BASE = "test/selfhealing/backlog-guard"

interface SelfHealConfig {
	models: string[]
}

function loadConfig(): SelfHealConfig {
	const cfgPath = `${BASE}/config.json`
	if (existsSync(cfgPath)) {
		try {
			return JSON.parse(readFileSync(cfgPath, "utf-8")) as SelfHealConfig
		} catch {
			// fall through
		}
	}
	return { models: ["opencode/deepseek-v4-flash-free", "opencode-go/deepseek-v4-flash"] }
}

const CONFIG = loadConfig()

interface ToolCallEvent {
	tool: string
	input: Record<string, unknown>
	output: string
	status: string
}

interface SessionData {
	texts: string[]
	toolCalls: ToolCallEvent[]
	totalCost: number
	totalTokens: number
	totalInputTokens: number
	totalOutputTokens: number
	totalReasoningTokens: number
	cacheRead: number
	cacheWrite: number
	llmVerdict: "PASS" | "FAIL" | "UNCLEAR"
}

interface SelfHealTest {
	id: string
	testFile: string
	fixPrompt: string
	requiredTools: string[]
}

const TESTS: SelfHealTest[] = [
	{
		id: "guard-access",
		testFile: "guard-access.test.ts",
		fixPrompt: "guard-access.fix.md",
		requiredTools: ["document_symbols"],
	},
]

function parseSession(stdout: string): SessionData {
	const texts: string[] = []
	const toolCalls: ToolCallEvent[] = []
	let totalCost = 0
	let totalTokens = 0
	let totalInputTokens = 0
	let totalOutputTokens = 0
	let totalReasoningTokens = 0
	let cacheRead = 0
	let cacheWrite = 0

	for (const line of stdout.trim().split("\n")) {
		if (!line) continue
		try {
			const ev = JSON.parse(line)

			if (ev.type === "text" && ev.part?.text) {
				texts.push(ev.part.text)
			}

			if (ev.type === "tool_use" && ev.part?.type === "tool") {
				const output =
					typeof ev.part.state?.output === "string"
						? ev.part.state.output.slice(0, 300)
						: JSON.stringify(ev.part.state?.output ?? "").slice(0, 300)
				toolCalls.push({
					tool: ev.part.tool ?? "unknown",
					input: ev.part.state?.input ?? {},
					output,
					status: ev.part.state?.status ?? "unknown",
				})
			}

			if (ev.type === "step_finish") {
				totalCost += ev.part?.cost ?? 0
				const tokens = ev.part?.tokens ?? {}
				totalTokens += tokens.total ?? 0
				totalInputTokens += tokens.input ?? 0
				totalOutputTokens += tokens.output ?? 0
				totalReasoningTokens += tokens.reasoning ?? 0
				cacheRead += tokens.cache?.read ?? 0
				cacheWrite += tokens.cache?.write ?? 0
			}
		} catch {
			// skip malformed lines
		}
	}

	const fullText = texts.join("\n")
	const passCount = (fullText.match(/✅ PASS/g) || []).length
	const failCount = (fullText.match(/❌ FAIL/g) || []).length
	let llmVerdict: "PASS" | "FAIL" | "UNCLEAR" = "UNCLEAR"
	if (passCount > failCount) llmVerdict = "PASS"
	else if (failCount > passCount) llmVerdict = "FAIL"

	return {
		texts,
		toolCalls,
		totalCost,
		totalTokens,
		totalInputTokens,
		totalOutputTokens,
		totalReasoningTokens,
		cacheRead,
		cacheWrite,
		llmVerdict,
	}
}

function runBunTest(testFile: string): { pass: boolean; output: string } {
	try {
		const output = execSync(`bun test ${BASE}/${testFile} 2>&1`, {
			encoding: "utf-8",
			timeout: 30_000,
		})
		return { pass: true, output }
	} catch (e: unknown) {
		return {
			pass: false,
			output: e instanceof Error && "stdout" in e ? String((e as { stdout: unknown }).stdout) : String(e),
		}
	}
}

// ─── Main ───────────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════╗")
console.log("║    Self-Healing: Backlog Guard                   ║")
console.log("╚══════════════════════════════════════════════════╝")
console.log()

// Pre-check: alle Fixtures müssen initial FAILen
console.log("  Pre-check: verifying all fixtures are in broken state...")
let fixtureOk = true
for (const t of TESTS) {
	const before = runBunTest(t.testFile)
	if (before.pass) {
		console.log(`  ❌  ${t.id} is PASSING — fixture was fixed by a previous run!`)
		console.log(`      Run: git checkout test/selfhealing/backlog-guard/${t.testFile}`)
		fixtureOk = false
	}
}
if (!fixtureOk) {
	console.log(`\n  ⚠️  Aborting — ${TESTS.length} test(s) need restoration. Run: git checkout test/selfhealing/backlog-guard/`)
	process.exit(1)
}
console.log(`  ✅  All ${TESTS.length} fixtures are in broken state`)
console.log()

// Probe: find first non-rate-limited model
let activeModelIndex = 0
console.log("  Probing models for rate limits...")
for (let i = 0; i < CONFIG.models.length; i++) {
	const model = CONFIG.models[i]
	const flag = i > 0 ? `--model "${model}" ` : ""
	process.stdout.write(`    ${model}: `)
	try {
		execSync(`opencode run --format=json ${flag}--title "probe" "echo ok"`, {
			encoding: "utf-8",
			timeout: 15_000,
		})
		console.log("✅")
		activeModelIndex = i
		break
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e)
		if (msg.includes("Rate limit") || msg.includes("429") || msg.includes("rate_limit")) {
			console.log("⚠️  rate limited")
		} else {
			console.log(`❌  ${msg.slice(0, 60)}`)
		}
	}
}
console.log(`  Using ${CONFIG.models[activeModelIndex]} for first test`)
console.log()

const report: {
	id?: string
	healed?: boolean
	skipped?: boolean
	cost?: number
	tokens?: Record<string, number>
	llmVerdict?: string
	actualVerdict?: string
	calibrationOk?: boolean
	toolSummary?: string
	duration?: number
}[] = []
let passed = 0
let failed = 0

for (const t of TESTS) {
	const fixPath = `${BASE}/${t.fixPrompt}`
	const _promptContent = readFileSync(fixPath, "utf-8")

	console.log(`── [${t.id}] ──────────────────────────`)

	// 1. Vorher: Test läuft rot
	const before = runBunTest(t.testFile)
	console.log(`  Before: ${before.pass ? "✅" : "❌"} (expected: FAIL)`)

	if (before.pass) {
		console.log(`  ⚠️  Test passed initially — nothing to heal. Skipping LLM step.`)
		report.push({ id: t.id, healed: true, skipped: true })
		passed++
		continue
	}

	// 2. LLM fixen lassen
	const llmTitle = `selfheal-${t.id}`
	let raw = ""
	let currentModelIndex = activeModelIndex

	async function runOpencode(modelIndex: number, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
		const model = CONFIG.models[modelIndex] ?? CONFIG.models[CONFIG.models.length - 1]
		const modelFlag = modelIndex > 0 ? `--model "${model}" ` : ""
		const cmd = `opencode run --format=json ${modelFlag}--title "${llmTitle}" "lies ${fixPath} und führ aus!"`
		const child = spawn("sh", ["-c", cmd], {
			stdio: ["ignore", "pipe", "pipe"],
			timeout: timeoutMs,
		})

		const chunks: string[] = []
		let stderrOut = ""

		child.stdout?.on("data", (buf: Buffer) => {
			const text = buf.toString()
			chunks.push(text)
			for (const line of text.split("\n").filter(Boolean)) {
				try {
					const ev = JSON.parse(line)
					if (ev.type === "step_start") process.stdout.write("  ⏳\r")
					if (ev.type === "step_finish") {
						const cost = ev.part?.cost ?? 0
						const tokens = ev.part?.tokens?.total ?? 0
						process.stdout.write(`  ✅ step $${cost.toFixed(4)} / ${tokens}t\r`)
					}
					if (ev.type === "tool_use") {
						process.stdout.write(`  🔧 ${ev.part?.tool || "tool"}\r`)
					}
				} catch {
					// skip
				}
			}
		})

		child.stderr?.on("data", (buf: Buffer) => {
			stderrOut += buf.toString()
		})

		return new Promise((resolve) => {
			child.on("close", () => {
				process.stdout.write("  \r")
				resolve({ stdout: chunks.join(""), stderr: stderrOut })
			})
			child.on("error", () => {
				resolve({ stdout: chunks.join(""), stderr: stderrOut })
			})
		})
	}

	console.log(`  LLM: ${CONFIG.models[currentModelIndex]}...`)
	let result = await runOpencode(currentModelIndex, 900_000)
	raw = result.stdout
	let errOutput = result.stderr

	while (
		currentModelIndex < CONFIG.models.length - 1 &&
		(raw.includes("Rate limit") ||
			raw.includes("rate_limit") ||
			raw.includes("429") ||
			errOutput.includes("Rate limit") ||
			errOutput.includes("rate_limit"))
	) {
		currentModelIndex++
		console.log(`  ⚠️  Rate limited — retrying with ${CONFIG.models[currentModelIndex]}`)
		result = await runOpencode(currentModelIndex, 900_000)
		raw = result.stdout
		errOutput = result.stderr
	}

	const session = parseSession(raw)

	// 3. Nachher: Test läuft grün?
	const after = runBunTest(t.testFile)
	console.log(`  After: ${after.pass ? "✅" : "❌"} (expected: PASS)`)

	// 4. LLM-Verdict-Analyse
	const actualVerdict = after.pass ? "PASS" : "FAIL"
	const calibrationOk = session.llmVerdict === actualVerdict

	// 5. Tool-Nutzung
	const toolCounts = new Map<string, number>()
	for (const tc of session.toolCalls) {
		toolCounts.set(tc.tool, (toolCounts.get(tc.tool) ?? 0) + 1)
	}
	const toolSummary = [...toolCounts.entries()].map(([name, count]) => `${name}(${count})`).join(", ")

	// Prüfen: Wurde ein erforderliches LSP-Tool verwendet?
	const usedTools = [...toolCounts.keys()]
	const usedRequiredTool = t.requiredTools.some((rt) => usedTools.includes(rt))
	if (after.pass && !usedRequiredTool) {
		console.log(`  ⚠️  Test passed but no LSP tool used (${t.requiredTools.join(", ")} expected)`)
		after.pass = false
	}

	const entry = {
		id: t.id,
		healed: after.pass,
		skipped: false,
		llmVerdict: session.llmVerdict,
		actualVerdict,
		calibrationOk,
		toolsUsed: [...toolCounts.keys()],
		toolSummary,
		toolCallCount: session.toolCalls.length,
		cost: session.totalCost,
		tokens: {
			input: session.totalInputTokens,
			output: session.totalOutputTokens,
			reasoning: session.totalReasoningTokens,
			total: session.totalTokens,
			cacheRead: session.cacheRead,
			cacheWrite: session.cacheWrite,
		},
	}
	report.push(entry)

	if (after.pass) passed++
	else failed++

	console.log()
}

// ─── Report ──────────────────────────────────────────────

console.log()
console.log("╔══════════════════════════════════════════════════╗")
console.log("║    Self-Healing Report                           ║")
console.log("╚══════════════════════════════════════════════════╝")
console.log()

for (const r of report) {
	if (r.skipped) {
		console.log(`⏭️  ${r.id} — already passing, skipped`)
		continue
	}
	const icon = r.healed ? "✅" : "❌"
	console.log(`${icon}  ${r.id}`)
	console.log(
		`    LLM verdict: ${r.llmVerdict} | Actual: ${r.actualVerdict} | Calibration: ${r.calibrationOk ? "✅" : "❌"}`,
	)
	console.log(`    Tools: ${r.toolSummary}`)
	console.log(
		`    Cost: $${(r.cost ?? 0).toFixed(4)} | Tokens: ${(r.tokens?.total as number) ?? 0} (in:${(r.tokens?.input as number) ?? 0} out:${(r.tokens?.output as number) ?? 0} reasoning:${(r.tokens?.reasoning as number) ?? 0})`,
	)
	console.log(`    Cache: read:${(r.tokens?.cacheRead as number) ?? 0} write:${(r.tokens?.cacheWrite as number) ?? 0}`)
	console.log()
}

const totals = { cost: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 }
for (const r of report) {
	if (r.skipped) continue
	const t = r.tokens as Record<string, number> | undefined
	totals.cost += r.cost ?? 0
	totals.input += t?.input ?? 0
	totals.output += t?.output ?? 0
	totals.reasoning += t?.reasoning ?? 0
	totals.cacheRead += t?.cacheRead ?? 0
	totals.cacheWrite += t?.cacheWrite ?? 0
}
const totalTokens = totals.input + totals.output + totals.reasoning + totals.cacheRead + totals.cacheWrite
console.log(`  Total cost: $${totals.cost.toFixed(4)} | Tokens: ${totalTokens}`)
console.log(
	`    in:${totals.input} out:${totals.output} reasoning:${totals.reasoning} cache:${totals.cacheRead}/${totals.cacheWrite}`,
)
console.log()
console.log(`Summary: ${passed} passed, ${failed} failed${report.filter((r) => r.skipped).length} skipped`)
console.log()
console.log("────────────────────────────────────────────")
console.log("  To restore fixtures to broken state:")
console.log("    git checkout test/selfhealing/backlog-guard/")
console.log("  Or:  bun run test:selfheal:guard:reset")
console.log("────────────────────────────────────────────")
console.log()

process.exit(failed > 0 ? 1 : 0)
