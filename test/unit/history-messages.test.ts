import { describe, expect, it } from "vitest";
import { lastHistoryMessageId, selectHistoryMessages } from "../../src/server/context/history-messages";
import { answer, derivedAnswer, question } from "../helpers/chat-entries";

// Relevant messages of a chat (TechSpec 2.8 "Maßgebliche Nachrichten", H-11).

const ids = (entries: Parameters<typeof selectHistoryMessages>[0]) => selectHistoryMessages(entries).map((m) => m.id);

describe("selectHistoryMessages", () => {
  it("keeps sent questions and answers in chat order and maps them to history messages", () => {
    const f1 = question("F1", "Which model?");
    const a1 = answer("A1", "F1", "complete", "Use model X.");
    expect(selectHistoryMessages([f1, a1])).toEqual([
      { from: "planner", id: "F1", text: "Which model?", at: f1.at },
      { from: "ai", id: "A1", text: "Use model X.", at: a1.at, status: "complete" },
    ]);
  });

  it("leaves out questions with status not_sent", () => {
    expect(ids([question("F1"), answer("A1", "F1"), question("F2", "x", "not_sent"), question("F3")])).toEqual([
      "F1",
      "A1",
      "F3",
    ]);
  });

  it("leaves out derived entries: incomplete without answer line and running without ai_start", () => {
    expect(ids([question("F1"), derivedAnswer("F1", "incomplete"), question("F2"), derivedAnswer("F2", "running")])).toEqual([
      "F1",
      "F2",
    ]);
  });

  it("keeps answers with an ai_start line of every status", () => {
    const entries = [
      question("F1"),
      answer("A1", "F1", "complete"),
      question("F2"),
      answer("A2", "F2", "incomplete"),
      answer("A3", "F2", "aborted"),
      question("F3"),
      answer("A4", "F3", "running"),
    ];
    expect(selectHistoryMessages(entries).map((m) => (m.from === "ai" ? m.status : "planner"))).toEqual([
      "planner",
      "complete",
      "planner",
      "incomplete",
      "aborted",
      "planner",
      "running",
    ]);
  });

  it("returns nothing for an empty chat", () => {
    expect(selectHistoryMessages([])).toEqual([]);
  });
});

describe("lastHistoryMessageId", () => {
  it("is the id of the last relevant message, ignoring a trailing not_sent question and derived entries", () => {
    expect(lastHistoryMessageId([question("F1"), answer("A1", "F1"), question("F2", "x", "not_sent")])).toBe("A1");
    expect(lastHistoryMessageId([question("F1"), answer("A1", "F1"), question("F2"), derivedAnswer("F2")])).toBe("F2");
  });

  it("is null when there is no relevant message", () => {
    expect(lastHistoryMessageId([])).toBeNull();
    expect(lastHistoryMessageId([question("F1", "x", "not_sent")])).toBeNull();
  });
});
