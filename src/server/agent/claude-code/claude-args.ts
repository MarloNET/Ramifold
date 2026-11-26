import path from "node:path";
import { areaPaths } from "../../area/area-paths";
import { SESSION_ID_PATTERN } from "../../area/file-schemas";
import type { AgentSession } from "../agent-port";
import type { ToolPolicy } from "../tool-policy";

// Policy and run -> argument list and settings of Claude Code (TechSpec 2.6, 2.15; REQ-024, REQ-025).
// Everything except `--resume`/`--fork-session` at the end comes only from the policy, never from the session.

/** Write, delete and command tools, always denied (REQ-024, AC-REQ-024-03). */
const DENIED_TOOLS = ["Edit", "Write", "Bash", "NotebookEdit"] as const;

export type ClaudeSettings = {
  permissions: {
    allow: string[];
    deny: string[];
    blockReadsOutsideWorkingDirectories: boolean;
  };
};

export type ClaudeRun = { requestId: string; projectFolder: string; session: AgentSession };

export type ClaudeArgs = {
  args: string[];
  settingsFile: string;
  settings: ClaudeSettings;
  contextFile: string;
};

export function buildClaudeArgs(policy: ToolPolicy, run: ClaudeRun): ClaudeArgs {
  const tmp = areaPaths(run.projectFolder).localTmp;
  const settingsFile = path.join(tmp, `${run.requestId}.settings.json`);
  const contextFile = path.join(tmp, `${run.requestId}.context.md`);
  const tools = policy.allowedTools.join(",");
  const args = [
    "-p",
    ...["--output-format", "stream-json", "--verbose", "--include-partial-messages"],
    "--restricted",
    ...["--tools", tools],
    ...["--allowedTools", tools],
    ...["--permission-mode", "dontAsk"],
    "--strict-mcp-config",
    "--disable-slash-commands",
    ...["--settings", settingsFile],
    ...["--append-system-prompt-file", contextFile],
    ...sessionArgs(run.session),
  ];
  const settings: ClaudeSettings = {
    permissions: {
      allow: [...policy.allowedTools],
      deny: [...policy.deniedReadPaths.map((relative) => `Read(./${relative})`), ...DENIED_TOOLS],
      blockReadsOutsideWorkingDirectories: policy.readScope === "project_folder",
    },
  };
  return { args, settingsFile, settings, contextFile };
}

function sessionArgs(session: AgentSession): string[] {
  if (session.mode === "new") return [];
  // Never passed: an invalid id could be read as an option (LocalStateFiles treats it as missing).
  if (!SESSION_ID_PATTERN.test(session.sessionId)) throw new Error("Invalid session id; it is never passed to Claude Code.");
  return session.mode === "resume" ? ["--resume", session.sessionId] : ["--resume", session.sessionId, "--fork-session"];
}
