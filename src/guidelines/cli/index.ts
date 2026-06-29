import { renderForCli } from "../render.ts";
import {
	MCP_TASK_CREATION_GUIDE,
	MCP_TASK_EXECUTION_GUIDE,
	MCP_TASK_FINALIZATION_GUIDE,
} from "../mcp/index.ts";
import cliOverview from "./overview.md" with { type: "text" };

export const CLI_OVERVIEW = cliOverview.trim();
export const CLI_TASK_CREATION_GUIDE = renderForCli(MCP_TASK_CREATION_GUIDE);
export const CLI_TASK_EXECUTION_GUIDE = renderForCli(MCP_TASK_EXECUTION_GUIDE);
export const CLI_TASK_FINALIZATION_GUIDE = renderForCli(MCP_TASK_FINALIZATION_GUIDE);
