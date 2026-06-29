const TOOL_MAP: [string, string][] = [
	["definition_of_done_defaults_get", "backlog config get definition_of_done --json"],
	["definition_of_done_defaults_upsert", "backlog config set definition_of_done"],
	["get_backlog_instructions", "backlog instructions"],
	["backlog://workflow/", "backlog instructions "],
	["task_search", "backlog search"],
	["task_list", "backlog task list --json"],
	["task_view", "backlog task view <id> --json"],
	["task_create", "backlog task create"],
	["task_edit", "backlog task edit"],
	["task_archive", "backlog task archive"],
	["document_create", "backlog doc create"],
	["document_update", "backlog doc update"],
	["document_list", "backlog doc list --json"],
	["document_view", "backlog doc view --json"],
	["document_search", "backlog doc search"],
	["Always operate through MCP tools", "Always use the CLI"],
	["MCP tools", "CLI"],
];

export function renderForCli(mcpText: string): string {
	let text = mcpText;
	for (const [mcp, cli] of TOOL_MAP) {
		text = text.replaceAll(mcp, cli);
	}
	text = text.replace(/\n{3,}/g, "\n\n");
	return text.trim();
}
