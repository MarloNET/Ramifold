import { SESSION_ID_PATTERN, type SessionEntry } from "../area/file-schemas";
import { selectHistoryMessages, type ChatEntry, type HistoryMessage } from "./history-messages";

// Session planning (TechSpec 2.8, REQ-029, -035, -037, -041, ADR-003) and the rule for the session entry after a
// chat run (TechSpec 2.7, FIND-039). Pure: no file access.

export type SessionPlanInput = {
  kind: "chat" | "suggest" | "summarize";
  /** Fingerprint of the current base text (context without `<previous-conversation>`). */
  fingerprint: string;
  /** Projected chat before this request: when sending without the question this request appended. */
  entries: readonly ChatEntry[];
  /** Chat resend: the resent question; the history for a new session ends before it. */
  resendMessageId?: string;
  /** Entry of the chat from `sessions.json`, null if there is none. */
  sessionEntry: SessionEntry | null;
  agent: { kind: string; capabilities: { canForkSession: boolean } };
  /** Planning again after the agent reported `session_unknown` for the resumed or forked session. */
  sessionUnknown?: boolean;
};

export type SessionPlan = {
  mode: "new" | "resume" | "fork";
  /** Session to resume or fork; null for a new session. */
  sessionId: string | null;
  /** Messages for `<previous-conversation>` (renderHistory); empty: the element is left out. */
  history: HistoryMessage[];
  /** Last message of `history`, stored with the session entry of a chat run. */
  historyThroughMessageId: string | null;
  /** Chat only: the session was lost; shows MSG-008 and is logged as `ai_session_rebuilt`. */
  sessionRebuilt: boolean;
};

/** Chooses the first matching row of the table in TechSpec 2.8 for the kind of the request. */
export function planSession(input: SessionPlanInput): SessionPlan {
  const allMessages = selectHistoryMessages(input.entries);
  // The session knows the chat when it knows the last relevant message of the whole chat before this request.
  const lastMessageId = allMessages.at(-1)?.id ?? null;
  const entry = validEntry(input.sessionEntry, input.agent.kind);
  const matches =
    entry !== null &&
    entry.contextFingerprint === input.fingerprint &&
    entry.knownThroughMessageId !== undefined &&
    entry.knownThroughMessageId === lastMessageId;
  const sessionStartHistory = matches ? historyThrough(allMessages, entry.historyThroughMessageId) : null;

  if (input.kind !== "chat") {
    const canFork = input.agent.capabilities.canForkSession && sessionStartHistory !== null;
    if (canFork && !input.sessionUnknown) return plan("fork", entry!.sessionId, sessionStartHistory, false);
    return plan("new", null, allMessages, false);
  }

  const earlierMessages = messagesBefore(allMessages, input.resendMessageId);
  if (earlierMessages.length === 0) return plan("new", null, [], false);
  if (input.sessionUnknown) return plan("new", null, earlierMessages, true);
  if (sessionStartHistory !== null) return plan("resume", entry!.sessionId, sessionStartHistory, false);
  return plan("new", null, earlierMessages, entry === null);
}

function plan(mode: SessionPlan["mode"], sessionId: string | null, history: HistoryMessage[], rebuilt: boolean) {
  return { mode, sessionId, history, historyThroughMessageId: history.at(-1)?.id ?? null, sessionRebuilt: rebuilt };
}

/** Entries of another agent kind or with an invalid session id count as missing (TechSpec 2.8, 3.2). */
function validEntry(entry: SessionEntry | null, agentKind: string): SessionEntry | null {
  if (entry === null || entry.agent !== agentKind || !SESSION_ID_PATTERN.test(entry.sessionId)) return null;
  return entry;
}

/** The history the session started with; null if `historyThroughMessageId` is not in the chat (does not match). */
function historyThrough(messages: HistoryMessage[], throughId: string | null): HistoryMessage[] | null {
  if (throughId === null) return [];
  const index = messages.findIndex((message) => message.id === throughId);
  return index === -1 ? null : messages.slice(0, index + 1);
}

function messagesBefore(messages: HistoryMessage[], messageId: string | undefined): HistoryMessage[] {
  const index = messageId === undefined ? -1 : messages.findIndex((message) => message.id === messageId);
  return index === -1 ? messages : messages.slice(0, index);
}

/** Outcome of a chat run as in the table "Ende des Laufs (Chat)" (TechSpec 2.7). */
export type ChatRunOutcome = "complete" | "incomplete" | "aborted" | "not_sent" | "external_change" | "node_deleted";

export type ChatRunResult = {
  outcome: ChatRunOutcome;
  /** Session id from the `init` event of the run, null if unknown. */
  sessionId: string | null;
  /** Id of the answer of this run, null if there is none. */
  answerId: string | null;
  /** The `ai_end` line of the answer was saved. */
  answerSaved: boolean;
  agentKind: string;
  contextFingerprint: string;
  historyThroughMessageId: string | null;
  now: Date;
};

/**
 * Rule for the session entry after a chat run (TechSpec 2.7, FIND-039): an entry is stored exactly for the outcomes
 * `complete`, `incomplete` (every cause) and `aborted`, if the session id is known and the answer's `ai_end` was
 * saved. Otherwise null: the previous entry stays unchanged.
 */
export function sessionEntryAfterChatRun(run: ChatRunResult): SessionEntry | null {
  const stores = run.outcome === "complete" || run.outcome === "incomplete" || run.outcome === "aborted";
  if (!stores || run.sessionId === null || run.answerId === null || !run.answerSaved) return null;
  return {
    agent: run.agentKind,
    sessionId: run.sessionId,
    contextFingerprint: run.contextFingerprint,
    historyThroughMessageId: run.historyThroughMessageId,
    knownThroughMessageId: run.answerId,
    updatedAt: run.now.toISOString(),
  };
}
