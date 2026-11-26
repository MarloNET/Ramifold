import type { AbortReason, AgentFailureCause } from "../agent-port";
import type { ClaudeResult } from "./stream-json-parser";

// Raw end of a Claude Code run -> outcome and cause code (TechSpec 2.6, CC-12, Baseline section 9).
// The first matching rule wins. The patterns live only here and are checked with real Claude Code before every
// release (R-09).

export type RawRunEnd = {
  abortedBy: AbortReason | null;
  idleTimeout: boolean;
  /** An exception inside the adapter after the start (e.g. while reading the output), TechSpec 2.6, N-08. */
  unexpectedError: boolean;
  /** errno code when the process could not be started. */
  spawnErrorCode: string | null;
  protocolError: boolean;
  result: ClaudeResult | null;
  /** Ring buffer of stderr (only for classification, never logged). */
  stderr: string;
  exitCode: number | null;
  signal: string | null;
};

export type RunClassification =
  | { outcome: "complete" }
  | { outcome: "aborted"; cause: "aborted_by_planner" }
  | { outcome: "failed"; cause: AgentFailureCause };

const SPAWN_NOT_FOUND = new Set(["ENOENT", "EACCES", "ENOTDIR"]);

/** Rules 7 to 11: pattern on the text of the error result or on stderr. */
const TEXT_RULES: ReadonlyArray<readonly [RegExp, AgentFailureCause]> = [
  [/no conversation found/i, "session_unknown"],
  [
    /(invalid api key|please run \/login|not logged in|log ?in required|authentication (failed|error)|unauthori[sz]ed|\b401\b|oauth token has expired)/i,
    "not_authenticated",
  ],
  [/(usage limit|rate limit|limit reached|\b429\b|quota)/i, "usage_limit"],
  [/(ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|network|connection error|fetch failed|socket hang up)/i, "network"],
  [/(overloaded|\b5\d\d\b|api error|internal server error|service unavailable)/i, "provider_error"],
];

export function classifyAgentFailure(end: RawRunEnd): RunClassification {
  const failed = (cause: AgentFailureCause): RunClassification => ({ outcome: "failed", cause });
  if (end.abortedBy === "planner") return { outcome: "aborted", cause: "aborted_by_planner" };
  if (end.abortedBy === "instance_stopped") return failed("instance_stopped");
  if (end.idleTimeout) return failed("timeout");
  if (end.unexpectedError) return failed("unknown");
  if (end.spawnErrorCode !== null && SPAWN_NOT_FOUND.has(end.spawnErrorCode)) return failed("agent_not_found");
  if (end.protocolError) return failed("agent_protocol");
  if (end.result !== null && !end.result.isError && end.result.subtype === "success") return { outcome: "complete" };
  const text = end.result !== null ? end.result.text : end.stderr;
  for (const [pattern, cause] of TEXT_RULES) if (pattern.test(text)) return failed(cause);
  if (end.result !== null) return failed("unknown");
  return failed(end.exitCode === 0 && end.signal === null ? "agent_protocol" : "agent_exited");
}
