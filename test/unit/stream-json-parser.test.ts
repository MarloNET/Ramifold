import { describe, expect, it } from "vitest";
import { StreamJsonParser, type StreamJsonEvent } from "../../src/server/agent/claude-code/stream-json-parser";

// One test per row of the output table in TechSpec 2.6.

const line = (value: unknown) => JSON.stringify(value);
const stream = (event: unknown) => line({ type: "stream_event", event, session_id: "S1" });
const messageStart = (id: string) => stream({ type: "message_start", message: { id, type: "message", role: "assistant", content: [] } });
const blockStart = (index = 0) => stream({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
const delta = (text: string) => stream({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
const assistant = (id: string, ...texts: string[]) =>
  line({ type: "assistant", message: { id, content: texts.map((text) => ({ type: "text", text })) } });

function parse(...lines: string[]): StreamJsonEvent[] {
  const parser = new StreamJsonParser();
  return lines.flatMap((l) => parser.push(l));
}

const texts = (events: StreamJsonEvent[]) => events.flatMap((e) => (e.type === "text" ? [e.text] : []));

describe("StreamJsonParser", () => {
  it("init: remembers the session id", () => {
    expect(parse(line({ type: "system", subtype: "init", session_id: "S1", cwd: "/x" }))).toEqual([{ type: "session", sessionId: "S1" }]);
  });

  it("text_delta: one text part per delta", () => {
    expect(parse(messageStart("m1"), blockStart(), delta("Hel"), delta("lo"))).toEqual([
      { type: "text", text: "Hel" },
      { type: "text", text: "lo" },
    ]);
  });

  it("content_block_start: inserts \\n\\n before the next part when a further text block begins after text", () => {
    expect(texts(parse(messageStart("m1"), blockStart(0), delta("One"), blockStart(1), delta("Two"), delta("!")))).toEqual([
      "One",
      "\n\nTwo",
      "!",
    ]);
  });

  it("content_block_start: no separator before the first text", () => {
    expect(texts(parse(messageStart("m1"), blockStart(0), blockStart(1), delta("First")))).toEqual(["First"]);
  });

  it("assistant: ignored when text parts of the same message.id came before", () => {
    expect(texts(parse(messageStart("m1"), blockStart(), delta("Hello"), assistant("m1", "Hello")))).toEqual(["Hello"]);
  });

  it("assistant: its text blocks become parts when no part of this message.id came (with \\n\\n between blocks)", () => {
    expect(texts(parse(assistant("m2", "First", "Second")))).toEqual(["First", "\n\nSecond"]);
  });

  it("assistant: a new message after streamed text of another message is separated by \\n\\n", () => {
    expect(texts(parse(messageStart("m1"), blockStart(), delta("A"), assistant("m1", "A"), assistant("m2", "B")))).toEqual(["A", "\n\nB"]);
  });

  it("result: end with subtype, is_error and the text of the last answer", () => {
    expect(parse(line({ type: "result", subtype: "success", is_error: false, result: "Answer", session_id: "S1" }))).toEqual([
      { type: "result", result: { subtype: "success", isError: false, text: "Answer" } },
    ]);
    expect(parse(line({ type: "result", subtype: "error_during_execution", is_error: true, result: "Boom" }))).toEqual([
      { type: "result", result: { subtype: "error_during_execution", isError: true, text: "Boom" } },
    ]);
  });

  it("other type values and other stream events are ignored", () => {
    expect(parse(line({ type: "user", message: {} }), line({ type: "system", subtype: "status" }), stream({ type: "message_stop" }))).toEqual(
      [],
    );
  });

  it("empty lines are ignored", () => {
    expect(parse("", "   ", "\t")).toEqual([]);
  });

  it.each(["fake-claude: this line is not JSON", "{broken", "42", "null", "[1]"])("a line that is no JSON event is a protocol error: %j", (raw) => {
    expect(parse(raw)).toEqual([{ type: "protocol_error" }]);
  });
});
