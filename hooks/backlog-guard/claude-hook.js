// @bun
// hooks/backlog-guard/guard-core.ts
import { basename, dirname, resolve } from "path";
import { parse as parseYaml } from "yaml";
import { parse as parseShell } from "shell-quote";
var READ_CMDS = new Set(["cat", "head", "tail", "less", "more", "bat"]);
var GREP_CMDS = new Set(["grep", "egrep", "fgrep"]);
var OPTS_WITH_VALUE = new Set([
  "-e",
  "-f",
  "-m",
  "-A",
  "-B",
  "-C",
  "-d",
  "--include",
  "--exclude",
  "--include-from",
  "--exclude-from"
]);
var _configCache = undefined;
function resolveDirs(root, raw) {
  const data = parseYaml(raw);
  const dirs = (data?.dirs ?? []).map((d) => resolve(root, d.trim()));
  return { dirs, configSource: resolve(root, ".backlog-guard") };
}
function loadConfig(cwd) {
  if (_configCache !== undefined)
    return _configCache;
  let p = cwd;
  for (let i = 0;i < 4; i++) {
    const candidate = resolve(p, ".backlog-guard");
    if (Bun.spawnSync(["test", "-e", candidate]).exitCode === 0) {
      const raw = Bun.spawnSync(["cat", candidate]).stdout.toString();
      _configCache = resolveDirs(dirname(candidate), raw);
      return _configCache;
    }
    const parent = dirname(p);
    if (parent === p)
      break;
    p = parent;
  }
  p = cwd;
  for (let i = 0;i < 4; i++) {
    if (Bun.spawnSync(["test", "-e", resolve(p, "backlog", "config.yml")]).exitCode === 0) {
      _configCache = { dirs: [resolve(p, "backlog")], configSource: "auto-detected" };
      return _configCache;
    }
    const parent = dirname(p);
    if (parent === p)
      break;
    p = parent;
  }
  _configCache = null;
  return null;
}
function loadConfigWithGitRoot(cwd) {
  if (_configCache !== undefined)
    return _configCache;
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], { cwd });
    const gitRoot = result.stdout.toString().trim();
    const candidate = resolve(gitRoot, ".backlog-guard");
    if (Bun.spawnSync(["test", "-e", candidate]).exitCode === 0) {
      const raw = Bun.spawnSync(["cat", candidate]).stdout.toString();
      _configCache = resolveDirs(gitRoot, raw);
      return _configCache;
    }
  } catch {}
  return loadConfig(cwd);
}
function isProtected(filePath, protectedDirs) {
  if (!filePath)
    return null;
  const abs = resolve(filePath).replace(/\\/g, "/");
  for (const d of protectedDirs) {
    const nd = d.replace(/\\/g, "/");
    if (abs === nd || abs.startsWith(nd + "/"))
      return d;
  }
  return null;
}
function extractTaskId(pathStr) {
  const m = basename(pathStr).match(/back-(\d+)/i);
  return m ? `BACK-${m[1]}` : null;
}
function classifyPath(pathStr) {
  const parts = pathStr.replace(/\\/g, "/").split("/");
  for (const part of parts) {
    if (part === "tasks" || part === "completed" || part === "drafts")
      return "task";
    if (part === "docs")
      return "doc";
    if (part === "decisions")
      return "decision";
    if (part === "milestones")
      return "milestone";
  }
  if (basename(pathStr).includes("config"))
    return "config";
  return "other";
}
function bashTargetsProtected(firstSegment, protectedDirs) {
  const normalized = firstSegment.replace(/\\/g, "/");
  const tokens = parseShell(normalized).filter(Boolean);
  if (tokens.length === 0)
    return null;
  const first = tokens[0];
  if (typeof first !== "string")
    return null;
  const cmdName = basename(first.replace(/^[&;\s]+/, ""));
  if (READ_CMDS.has(cmdName)) {
    for (let i = 1;i < tokens.length; i++) {
      const t = tokens[i];
      if (typeof t !== "string")
        continue;
      if (!t.startsWith("-") && isProtected(t, protectedDirs))
        return t;
    }
  } else if (GREP_CMDS.has(cmdName)) {
    const positional = [];
    let i = 1;
    while (i < tokens.length) {
      const t = tokens[i];
      if (typeof t !== "string") {
        i++;
        continue;
      }
      if (t.startsWith("-") && OPTS_WITH_VALUE.has(t)) {
        i += 2;
        continue;
      }
      if (!t.startsWith("-"))
        positional.push(t);
      i++;
    }
    for (const farg of positional.slice(1)) {
      if (isProtected(farg, protectedDirs))
        return farg;
    }
  } else if (cmdName === "find") {
    for (let i = 1;i < tokens.length; i++) {
      const t = tokens[i];
      if (typeof t !== "string")
        continue;
      if (t.startsWith("-"))
        break;
      if (isProtected(t, protectedDirs))
        return t;
    }
  }
  return null;
}
function oc(tool) {
  return `backlog_${tool}`;
}
function cc(tool) {
  return `mcp__backlog__${tool}`;
}
function both(tool) {
  return `${cc(tool)}  /  ${oc(tool)}`;
}
function taskSuggestions(op, tid) {
  const id = tid || "BACK-NNN";
  if (op === "read" || op === "Read") {
    return `${both("task_view")}(id="${id}")
CLI:  backlog task ${id}`;
  }
  if ((op === "write" || op === "Write") && !tid) {
    return `${both("task_create")}(title="...", description="...")
CLI:  backlog task create "Title" -d "..."`;
  }
  return `${both("task_edit")}(id="${id}", plan="...", notes="...")
CLI:  backlog task edit ${id} --plan "..." --append-notes "..."`;
}
function docSuggestions(op, blockedPath) {
  const name = basename(blockedPath);
  if (op === "read" || op === "Read") {
    return `${both("document_view")}(path="${name}")
CLI:  backlog doc ${name}`;
  }
  if ((op === "write" || op === "Write") && Bun.spawnSync(["test", "-e", blockedPath]).exitCode !== 0) {
    return `${both("document_create")}(title="...", content="...")
CLI:  backlog doc create "Title"`;
  }
  return `${both("document_update")}(path="${name}", content="...")
CLI:  backlog doc update ${name}`;
}
function milestoneSuggestions(op) {
  if (op === "read" || op === "Read") {
    return `${both("milestone_list")}()
CLI:  backlog milestones`;
  }
  if (op === "write" || op === "Write") {
    return `${both("milestone_add")}(name="...", description="...")
CLI:  backlog milestone add "Name"`;
  }
  return [
    `${both("milestone_rename")}(from="...", to="...")
CLI:  backlog milestone rename "Old" "New"`,
    `${both("milestone_remove")}(name="...")
CLI:  backlog milestone remove "Name"`,
    `${both("milestone_archive")}(name="...")
CLI:  backlog milestone archive "Name"`
  ].join(`

`);
}
function decisionSuggestions(op) {
  if (op === "read" || op === "Read") {
    return `Search:  backlog search "<keyword>" --type decision
CLI:  backlog search "<keyword>" --type decision`;
  }
  if (op === "write" || op === "Write") {
    return 'CLI:  backlog decision create "Title" --status proposed';
  }
  return `CLI:  backlog decision create "Title" --status proposed
` + 'Note: Decisions have no dedicated edit or view tool. To review: backlog search "<keyword>" --type decision';
}
function configSuggestions() {
  return `CLI:  backlog config list
CLI:  backlog config get <key>
CLI:  backlog config set <key> <value>`;
}
function genericSuggestions() {
  return [
    `${both("task_list")}()  or  ${both("task_search")}(query="...")`,
    'CLI:  backlog task list  or  backlog search "..."'
  ].join(`
`);
}
function grepSuggestions(pattern, kind) {
  if (kind === "doc" || kind === "decision") {
    return `${both("document_search")}(query="${pattern}")
CLI:  backlog search "${pattern}"`;
  }
  if (kind === "task" || kind === "other") {
    return `${both("task_search")}(query="${pattern}")
CLI:  backlog search "${pattern}"`;
  }
  return [
    `${both("task_search")}(query="${pattern}")`,
    `  or  ${both("document_search")}(query="${pattern}")`,
    `CLI:  backlog search "${pattern}"`
  ].join(`
`);
}
function buildErrorMessage(tool, kind, taskId, blockedPath, matchedDir, configSource, grepPattern) {
  let header;
  if (tool === "Grep" || tool === "grep") {
    header = "BACKLOG GUARD -- Grep on backlog directory is forbidden.";
  } else if (taskId) {
    header = `BACKLOG GUARD -- ${tool} on task file (${taskId}) is forbidden.`;
  } else {
    header = `BACKLOG GUARD -- ${tool} on backlog directory is forbidden.`;
  }
  const op = tool === "Bash" || tool === "bash" ? "read" : tool;
  let suggestion;
  if (tool === "Grep" || tool === "grep") {
    suggestion = grepSuggestions(grepPattern || "...", kind);
  } else if (kind === "task") {
    suggestion = taskSuggestions(op, taskId);
  } else if (kind === "doc") {
    suggestion = docSuggestions(op, blockedPath);
  } else if (kind === "milestone") {
    suggestion = milestoneSuggestions(op);
  } else if (kind === "decision") {
    suggestion = decisionSuggestions(op);
  } else if (kind === "config") {
    suggestion = configSuggestions();
  } else {
    suggestion = genericSuggestions();
  }
  const matchedStr = matchedDir || "unknown";
  return [
    `\u26D4 ${header}`,
    "All backlog data access must go through MCP tools or the backlog CLI.",
    `Target: ${blockedPath}`,
    "",
    "USE ONE OF THESE INSTEAD:",
    suggestion,
    "",
    `Protected directory: ${matchedStr}`,
    `Config: ${configSource}`
  ].join(`
`);
}
function evaluate(input, config) {
  const { tool, filePath, command, grepPath, grepPattern } = input;
  let blockedPath = null;
  let matchedDir = null;
  let actualGrepPattern = grepPattern;
  const toolLower = tool.toLowerCase();
  if (toolLower === "read" || toolLower === "edit" || toolLower === "write") {
    const fp = filePath || "";
    matchedDir = isProtected(fp, config.dirs);
    if (matchedDir)
      blockedPath = fp;
  } else if (toolLower === "grep") {
    const p = grepPath || "";
    matchedDir = isProtected(p, config.dirs);
    if (matchedDir) {
      blockedPath = p;
      actualGrepPattern = actualGrepPattern || "...";
    }
  } else if (toolLower === "bash") {
    const cmd = command || "";
    const firstSeg = cmd.split("|")[0] || "";
    const hit = bashTargetsProtected(firstSeg, config.dirs);
    if (hit) {
      blockedPath = hit;
      matchedDir = isProtected(hit, config.dirs);
    }
  }
  if (!blockedPath)
    return { blocked: false };
  const kind = classifyPath(blockedPath);
  const taskId = kind === "task" ? extractTaskId(blockedPath) : null;
  const errorMessage = buildErrorMessage(tool, kind, taskId, blockedPath, matchedDir, config.configSource, actualGrepPattern);
  return {
    blocked: true,
    blockedPath,
    matchedDir: matchedDir || undefined,
    kind,
    taskId: taskId || undefined,
    errorMessage
  };
}
function createGuardEntry(input, cwd) {
  const config = loadConfigWithGitRoot(cwd);
  if (!config)
    return { blocked: false };
  return evaluate(input, config);
}

// hooks/backlog-guard/claude-hook.ts
var tool = Bun.env.HOOK_TOOL || "";
var fp = Bun.env.HOOK_FP || "";
var cmd = Bun.env.HOOK_CMD || "";
var toolInput = {};
try {
  toolInput = JSON.parse(Bun.env.HOOK_INPUT || "{}");
} catch {}
var input = {
  tool,
  filePath: fp,
  command: cmd,
  grepPath: toolInput.path || toolInput.grepPath || "",
  grepPattern: toolInput.pattern || toolInput.grepPattern || ""
};
var result = createGuardEntry(input, process.cwd());
if (!result.blocked) {
  process.exit(0);
}
var output = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: result.errorMessage
  }
};
process.stdout.write(JSON.stringify(output));
