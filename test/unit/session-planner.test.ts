import { describe, expect, it } from "vitest";
import type { SessionEntry } from "../../src/server/area/file-schemas";
import type { ChatEntry } from "../../src/server/context/history-messages";
import {
  planSession,
  sessionEntryAfterChatRun,
  type ChatRunOutcome,
  type SessionPlanInput,
} from "../../src/server/context/session-planner";
import { answer, derivedAnswer, question } from "../helpers/chat-entries";

// Session planning (TechSpec 2.8 table, fork conditions, examples (1) to (5)) and the rule for the session entry
// after a chat run (TechSpec 2.7, FIND-039).

const FP = "a".repeat(64);
const OTHER_FP = "b".repeat(64);
const CLAUDE = { kind: "claude-code", capabilities: { canForkSession: true } };

function entry(fields: Partial<SessionEntry> = {}): SessionEntry {
  return {
    agent: "claude-code",
    sessionId: "S1",
    contextFingerprint: FP,
    historyThroughMessageId: null,
    knownThroughMessageId: "A1",
    updatedAt: "2026-11-24T10:00:00.000Z",
    ...fields,
  };
}

function plan(input: Partial<SessionPlanInput> & Pick<SessionPlanInput, "entries">) {
  return planSession({ kind: "chat", fingerprint: FP, sessionEntry: null, agent: CLAUDE, ...input });
}

const historyIds = (result: ReturnType<typeof planSession>) => result.history.map((m) => m.id);

/** Chat `F1, A1` with a session entry that knows it (example (1)). */
const CHAT_1 = (): ChatEntry[] => [question("F1"), answer("A1", "F1")];

describe("planSession, kind chat", () => {
  it("row 1: no earlier relevant messages → new session without history", () => {
    for (const entries of [[], [question("F1", "x", "not_sent")]]) {
      expect(plan({ entries, sessionEntry: entry() })).toEqual({
        mode: "new",
        sessionId: null,
        history: [],
        historyThroughMessageId: null,
        sessionRebuilt: false,
      });
    }
  });

  it("row 2: matching entry → resume with the history of the session start (up to historyThroughMessageId)", () => {
    const entries = [question("F1"), answer("A1", "F1"), question("F2"), answer("A2", "F2")];
    const result = plan({ entries, sessionEntry: entry({ historyThroughMessageId: "A1", knownThroughMessageId: "A2" }) });
    expect(result).toMatchObject({ mode: "resume", sessionId: "S1", historyThroughMessageId: "A1", sessionRebuilt: false });
    expect(historyIds(result)).toEqual(["F1", "A1"]);
  });

  it("row 2: a session started without history resumes without history", () => {
    const result = plan({ entries: CHAT_1(), sessionEntry: entry({ historyThroughMessageId: null }) });
    expect(result).toEqual({ mode: "resume", sessionId: "S1", history: [], historyThroughMessageId: null, sessionRebuilt: false });
  });

  it("row 3: Claude Code reported session_unknown → once a new session with all earlier messages, rebuilt", () => {
    const result = plan({ entries: CHAT_1(), sessionEntry: entry(), sessionUnknown: true });
    expect(result).toMatchObject({ mode: "new", sessionId: null, historyThroughMessageId: "A1", sessionRebuilt: true });
    expect(historyIds(result)).toEqual(["F1", "A1"]);
  });

  it("row 4: entry with another fingerprint → new session with all earlier messages, not rebuilt", () => {
    const result = plan({ entries: CHAT_1(), sessionEntry: entry({ contextFingerprint: OTHER_FP }) });
    expect(result).toMatchObject({ mode: "new", sessionId: null, historyThroughMessageId: "A1", sessionRebuilt: false });
    expect(historyIds(result)).toEqual(["F1", "A1"]);
  });

  it("row 5: same fingerprint, but the session does not know the chat (field missing or stale) → new, not rebuilt", () => {
    const withoutField = entry();
    delete withoutField.knownThroughMessageId;
    for (const sessionEntry of [withoutField, entry({ knownThroughMessageId: "F1" })]) {
      const result = plan({ entries: CHAT_1(), sessionEntry });
      expect(result).toMatchObject({ mode: "new", sessionId: null, sessionRebuilt: false });
      expect(historyIds(result)).toEqual(["F1", "A1"]);
    }
  });

  it("row 6: no entry on this machine, but earlier relevant messages → new session with history, rebuilt", () => {
    const result = plan({ entries: CHAT_1(), sessionEntry: null });
    expect(result).toMatchObject({ mode: "new", sessionId: null, historyThroughMessageId: "A1", sessionRebuilt: true });
    expect(historyIds(result)).toEqual(["F1", "A1"]);
  });

  it("an entry of another agent kind or with an invalid sessionId counts as missing (row 6)", () => {
    for (const sessionEntry of [entry({ agent: "other-agent" }), entry({ sessionId: "-bad id" })]) {
      expect(plan({ entries: CHAT_1(), sessionEntry })).toMatchObject({ mode: "new", sessionRebuilt: true });
    }
  });

  describe("examples (1) to (5) of TechSpec 2.8 (entry with matching fingerprint)", () => {
    it("(1) chat F1, A1, entry A1, new question F2 → resume", () => {
      expect(plan({ entries: CHAT_1(), sessionEntry: entry() }).mode).toBe("resume");
    });

    it("(2) F2 ended not_sent, then new question F3 → still A1 → resume; also resend of F2 and a fork", () => {
      const entries = [...CHAT_1(), question("F2", "x", "not_sent")];
      expect(plan({ entries, sessionEntry: entry() }).mode).toBe("resume");
      expect(plan({ entries, sessionEntry: entry(), resendMessageId: "F2" }).mode).toBe("resume");
      expect(plan({ entries, sessionEntry: entry(), kind: "suggest" }).mode).toBe("fork");
    });

    it("(3) F2 with incomplete answer A2, entry A2, resend of F2 → resume", () => {
      const entries = [...CHAT_1(), question("F2"), answer("A2", "F2", "incomplete")];
      const result = plan({ entries, sessionEntry: entry({ knownThroughMessageId: "A2" }), resendMessageId: "F2" });
      expect(result.mode).toBe("resume");
    });

    it("(3) without a matching entry, the history of a resend ends before the resent question", () => {
      const entries = [...CHAT_1(), question("F2"), answer("A2", "F2", "incomplete")];
      const result = plan({ entries, sessionEntry: entry({ contextFingerprint: OTHER_FP }), resendMessageId: "F2" });
      expect(result.mode).toBe("new");
      expect(historyIds(result)).toEqual(["F1", "A1"]);
    });

    it("(4) F3, A3 came from the desktop via Git → A3 ≠ A1 → new session with all messages, without MSG-008", () => {
      const entries = [...CHAT_1(), question("F3"), answer("A3", "F3")];
      const result = plan({ entries, sessionEntry: entry() });
      expect(result).toMatchObject({ mode: "new", sessionRebuilt: false });
      expect(historyIds(result)).toEqual(["F1", "A1", "F3", "A3"]);
    });

    it("(5) entry A2, chat reset to F1, A1 by git checkout → A1 ≠ A2 → new session with F1, A1, without MSG-008", () => {
      const result = plan({ entries: CHAT_1(), sessionEntry: entry({ knownThroughMessageId: "A2" }) });
      expect(result).toMatchObject({ mode: "new", sessionRebuilt: false });
      expect(historyIds(result)).toEqual(["F1", "A1"]);
    });
  });

  it("derived entries do not count as messages the session must know", () => {
    const entries = [...CHAT_1(), question("F2", "x", "not_sent"), derivedAnswer("F2", "running")];
    expect(plan({ entries, sessionEntry: entry() }).mode).toBe("resume");
  });
});

describe.each(["suggest", "summarize"] as const)("planSession, kind %s", (kind) => {
  const forkInput = (fields: Partial<SessionPlanInput> = {}): SessionPlanInput => ({
    kind,
    fingerprint: FP,
    entries: [question("F1"), answer("A1", "F1"), question("F2"), answer("A2", "F2")],
    sessionEntry: entry({ historyThroughMessageId: "A1", knownThroughMessageId: "A2" }),
    agent: CLAUDE,
    ...fields,
  });

  it("fork possible → fork the chat session with the history of its start", () => {
    const result = planSession(forkInput());
    expect(result).toMatchObject({ mode: "fork", sessionId: "S1", historyThroughMessageId: "A1", sessionRebuilt: false });
    expect(historyIds(result)).toEqual(["F1", "A1"]);
  });

  it("fork reported session_unknown → fallback: new one-time session with all messages, not rebuilt", () => {
    const result = planSession(forkInput({ sessionUnknown: true }));
    expect(result).toMatchObject({ mode: "new", sessionId: null, sessionRebuilt: false });
    expect(historyIds(result)).toEqual(["F1", "A1", "F2", "A2"]);
  });

  const violations: [string, Partial<SessionPlanInput>][] = [
    ["1: capability canForkSession missing", { agent: { kind: "claude-code", capabilities: { canForkSession: false } } }],
    ["2: no entry", { sessionEntry: null }],
    ["2: entry of another agent kind", { sessionEntry: entry({ agent: "other-agent", knownThroughMessageId: "A2" }) }],
    ["2: entry with invalid sessionId", { sessionEntry: entry({ sessionId: "bad/id", knownThroughMessageId: "A2" }) }],
    ["3: other fingerprint", { fingerprint: OTHER_FP }],
    ["4: session does not know the chat", { sessionEntry: entry({ knownThroughMessageId: "A1" }) }],
  ];
  it.each(violations)("fork not possible (condition %s) → new one-time session with all messages", (_name, fields) => {
    const result = planSession(forkInput(fields));
    expect(result).toMatchObject({ mode: "new", sessionId: null, sessionRebuilt: false });
    expect(historyIds(result)).toEqual(["F1", "A1", "F2", "A2"]);
  });

  it("fork not possible without a chat → new one-time session without history", () => {
    expect(planSession(forkInput({ entries: [] }))).toEqual({
      mode: "new",
      sessionId: null,
      history: [],
      historyThroughMessageId: null,
      sessionRebuilt: false,
    });
  });
});

describe("sessionEntryAfterChatRun (TechSpec 2.7, FIND-039)", () => {
  const NOW = new Date("2026-11-25T08:00:00.000Z");
  const run = (outcome: ChatRunOutcome, sessionId: string | null, answerSaved = true) =>
    sessionEntryAfterChatRun({
      outcome,
      sessionId,
      answerId: "A9",
      answerSaved,
      agentKind: "claude-code",
      contextFingerprint: FP,
      historyThroughMessageId: "A1",
      now: NOW,
    });
  const saved = (sessionId: string) => ({
    agent: "claude-code",
    sessionId,
    contextFingerprint: FP,
    historyThroughMessageId: "A1",
    knownThroughMessageId: "A9",
    updatedAt: NOW.toISOString(),
  });

  // One case per row of the table "Ende des Laufs (Chat)"; session_unknown takes the outcome of the second run.
  const rows: [string, ChatRunOutcome, boolean][] = [
    ["complete", "complete", true],
    ["not_authenticated / agent_not_found without text part → not_sent", "not_sent", false],
    ["aborted by the planner", "aborted", true],
    ["session_unknown, second run complete", "complete", true],
    ["other cause → incomplete", "incomplete", true],
    ["Ramifold stopped in order → incomplete instance_stopped", "incomplete", true],
    ["node deleted", "node_deleted", false],
    ["external change", "external_change", false],
  ];

  it.each(rows)("%s: entry saved only with a known session id", (_row, outcome, stores) => {
    expect(run(outcome, "S2")).toEqual(stores ? saved("S2") : null);
    expect(run(outcome, null)).toBeNull();
  });

  it.each(["complete", "incomplete", "aborted"] as const)(
    "%s: no entry when saving the answer failed (the previous entry stays)",
    (outcome) => {
      expect(run(outcome, "S2", false)).toBeNull();
    },
  );
});
