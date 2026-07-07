import type { Command } from "commander";
import {
	CLI_OVERVIEW,
	CLI_TASK_CREATION_GUIDE,
	CLI_TASK_EXECUTION_GUIDE,
	CLI_TASK_FINALIZATION_GUIDE,
} from "../guidelines/cli/index.ts";
import { EXIT } from "../utils/exit-codes.ts";

type GuideKey = "overview" | "task-creation" | "task-execution" | "task-finalization";

const GUIDES: Record<GuideKey, string> = {
	overview: CLI_OVERVIEW,
	"task-creation": CLI_TASK_CREATION_GUIDE,
	"task-execution": CLI_TASK_EXECUTION_GUIDE,
	"task-finalization": CLI_TASK_FINALIZATION_GUIDE,
};

const GUIDE_KEYS = Object.keys(GUIDES) as GuideKey[];

function printList(): void {
	console.log("Available workflow guides:");
	console.log("");
	for (const key of GUIDE_KEYS) {
		const descriptions: Record<string, string> = {
			overview: "When to use Backlog, workflow overview, CLI commands reference",
			"task-creation": "Scope assessment, acceptance criteria, subtasks vs separate tasks",
			"task-execution": "Planning workflow, implementation discipline, handling scope changes",
			"task-finalization": "Definition of Done, finalization checklist, next steps",
		};
		console.log(`  backlog instructions ${key}`);
		console.log(`    ${descriptions[key]}`);
	}
	console.log("");
	console.log("Example: backlog instructions task-creation");
	console.log("");
	console.log("LLM agents: start with 'backlog instructions overview' to learn the workflow.");
}

export function registerInstructionsCommand(program: Command): void {
	program
		.command("instructions [guide]")
		.description("display workflow guidance for LLM agents using the CLI")
		.action((guide?: string) => {
			if (!guide) {
				printList();
				return;
			}
			const key = guide.toLowerCase() as GuideKey;
			const content = GUIDES[key];
			if (!content) {
				console.error(`Unknown guide: ${guide}`);
				console.error(`Available guides: ${GUIDE_KEYS.join(", ")}`);
				process.exit(EXIT.ERROR);
			}
			console.log(content);
		});
}
