import type { CauseCode } from "../../shared/codes";
import type { ToolPolicy } from "./tool-policy";

// Provider-neutral interface of the domain logic to the agent (TechSpec 2.6, 4.3, ADR-003, REQ-065 no. 8).
// The agent knows no plan; it reports via the callbacks of AgentRunSpec.

/** Kind of agent; key `agent` in `sessions.json`. */
export type AgentKind = "claude-code";

/** Session of a run (TechSpec 2.6, v0.9); only an adapter with `canForkSession` ever gets `fork`. */
export type AgentSession = { mode: "new" } | { mode: "resume"; sessionId: string } | { mode: "fork"; sessionId: string };

export type AgentRunSpec = {
  requestId: string;
  /** Canonical project folder; working directory of the run. */
  projectFolder: string;
  /** Context text for the system prompt (TechSpec 2.8). */
  context: string;
  /** Message of the planner or task text; written to stdin as UTF-8. */
  message: string;
  session: AgentSession;
  /** A text part of the answer (REQ-020). */
  onText(text: string): void;
  /** Session id reported by the agent. */
  onSessionId?(sessionId: string): void;
};

/** Who ended a run early: the planner (REQ-021) or the orderly stop of Ramifold (REQ-028). */
export type AbortReason = "planner" | "instance_stopped";

/** Cause of an incomplete run; `session_unknown` is internal only and never shown (TechSpec 2.6 rule 7). */
export type AgentFailureCause = Exclude<CauseCode, "aborted_by_planner" | "unusable_result" | "external_change" | "node_deleted"> | "session_unknown";

export type AgentRunResult =
  | { outcome: "complete"; sessionId: string | null; resultText: string }
  | { outcome: "aborted"; cause: "aborted_by_planner"; sessionId: string | null }
  | {
      outcome: "failed";
      cause: AgentFailureCause;
      sessionId: string | null;
      /** For `detail` of `ai_request_failed` (`exit=<code>`, `signal=<sig>`, TechSpec 2.14); null if the process never ran. */
      exitCode: number | null;
      signal: string | null;
    };

/** A file a run needs in `.ramifold/local/tmp/`; `name` is always `<requestId>.<extension>`, without a path. */
export type AgentRunFile = { name: string; content: string };

export type AgentRunHandle = {
  /** Never rejects: every end of the run is an AgentRunResult (TechSpec 2.6, N-08). */
  readonly done: Promise<AgentRunResult>;
  /** Ends the process (SIGTERM, after 3 s SIGKILL); without effect once the run has ended. */
  abort(reason: AbortReason): void;
};

/** Last finding about the agent (TechSpec 3.3). */
export type AgentFinding = { status: "checking" | "ok" | "not_found" | "too_old"; version: string | null };

/**
 * Contract (TechSpec 2.6, N-08): `runFiles` and `start` throw only on errors of the caller (`requestId` no ULID,
 * invalid `sessionId`, `fork` without the capability), synchronously and before any side effect. Every adapter ends a
 * run without output for longer than its idle limit with `failed` `timeout`.
 */
export interface AgentPort {
  readonly kind: AgentKind;
  readonly capabilities: { readonly canForkSession: boolean };
  /** Checks whether the agent can be started (REQ-004); never rejects. */
  checkAvailability(): Promise<AgentFinding>;
  /** Files the run needs; pure (no I/O, no process). They are written by `LocalStateFiles` before `start`. */
  runFiles(policy: ToolPolicy, spec: AgentRunSpec): AgentRunFile[];
  /** Starts the process synchronously and returns the handle at once; expects the run files and writes nothing. */
  start(policy: ToolPolicy, spec: AgentRunSpec): AgentRunHandle;
}
