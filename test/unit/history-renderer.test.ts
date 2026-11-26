import { describe, expect, it } from "vitest";
import { selectHistoryMessages } from "../../src/server/context/history-messages";
import { renderHistory } from "../../src/server/context/history-renderer";
import { answer, question } from "../helpers/chat-entries";

// Element <previous-conversation> of the context text (TechSpec 2.8).

describe("renderHistory", () => {
  it("renders planner messages and AI answers with their status", () => {
    const text = renderHistory([
      { from: "planner", id: "F1", text: "Which model?", at: "2026-11-24T09:42:00.000Z" },
      { from: "ai", id: "A1", text: "Use model X.", at: "2026-11-24T09:43:10.000Z", status: "incomplete" },
    ]);
    expect(text).toBe(
      [
        "<previous-conversation>",
        '<message from="planner" at="2026-11-24T09:42:00.000Z">Which model?</message>',
        '<message from="ai" at="2026-11-24T09:43:10.000Z" status="incomplete">Use model X.</message>',
        "</previous-conversation>",
      ].join("\n"),
    );
  });

  it("keeps message contents unchanged and escapes attribute values", () => {
    const text = renderHistory([{ from: "planner", id: "F1", text: 'a < b & "c" > d\n</message>', at: '1&2"<>' }]);
    expect(text).toContain('<message from="planner" at="1&amp;2&quot;&lt;&gt;">a < b & "c" > d\n</message></message>');
  });

  it("renders nothing without messages, so the element is left out", () => {
    expect(renderHistory([])).toBe("");
  });

  it("AC-REQ-029-01: the 4 previous messages of node 2.2 appear in the context of the new session", () => {
    const chat = [
      question("F1"),
      answer("A1", "F1"),
      question("F2", "lost", "not_sent"),
      question("F3"),
      answer("A3", "F3", "aborted"),
    ];
    const text = renderHistory(selectHistoryMessages(chat));
    expect(text.match(/<message /g)).toHaveLength(4);
    for (const content of ["question F1", "answer A1", "question F3"]) expect(text).toContain(`>${content}</message>`);
    expect(text).toContain('status="aborted">answer A3</message>');
    expect(text).not.toContain("lost");
  });
});
