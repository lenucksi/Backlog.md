# Cross-Modality Parity Check

When reviewing changed files, check all 5 modalities:
1. **CLI**: `src/cli.ts` or `src/commands/` — command/subcommand exists
2. **TUI**: `src/ui/` — screen/keybinding exists
3. **WebUI**: `src/web/` + `src/server/` — component/page + REST endpoint exist
4. **MCP**: `src/mcp/tools/` — tool exists with handler + schema
5. **REST**: `src/server/router.ts` + `src/server/handlers/` — HTTP endpoint with handler + route exists

If a feature changes one but not others, flag it.
