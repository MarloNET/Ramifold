// stdout lines of Claude Code (`--output-format stream-json --include-partial-messages`) -> events (TechSpec 2.6,
// REQ-020). One JSON line per event; empty lines and unknown `type` values are ignored.

export type ClaudeResult = { subtype: string; isError: boolean; text: string };

export type StreamJsonEvent =
  | { type: "session"; sessionId: string }
  | { type: "text"; text: string }
  | { type: "result"; result: ClaudeResult }
  | { type: "protocol_error" };

type Json = Record<string, unknown>;

const BLOCK_SEPARATOR = "\n\n";

export class StreamJsonParser {
  private hasText = false;
  private separatorPending = false;
  private currentMessageId: string | null = null;
  private readonly messagesWithParts = new Set<string>();

  /** Parses one line (without line break) into zero or more events. */
  push(line: string): StreamJsonEvent[] {
    if (line.trim() === "") return [];
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      return [{ type: "protocol_error" }];
    }
    if (!isObject(value)) return [{ type: "protocol_error" }];
    switch (value.type) {
      case "system":
        return value.subtype === "init" && typeof value.session_id === "string"
          ? [{ type: "session", sessionId: value.session_id }]
          : [];
      case "stream_event":
        return isObject(value.event) ? this.streamEvent(value.event) : [];
      case "assistant":
        return isObject(value.message) ? this.assistantMessage(value.message) : [];
      case "result":
        return [
          {
            type: "result",
            result: {
              subtype: typeof value.subtype === "string" ? value.subtype : "",
              isError: value.is_error === true,
              text: typeof value.result === "string" ? value.result : "",
            },
          },
        ];
      default:
        return [];
    }
  }

  private streamEvent(event: Json): StreamJsonEvent[] {
    if (event.type === "message_start") {
      this.currentMessageId = isObject(event.message) && typeof event.message.id === "string" ? event.message.id : null;
    } else if (event.type === "content_block_start" && isObject(event.content_block) && event.content_block.type === "text") {
      if (this.hasText) this.separatorPending = true;
    } else if (event.type === "content_block_delta" && isObject(event.delta) && event.delta.type === "text_delta") {
      if (typeof event.delta.text !== "string" || event.delta.text === "") return [];
      if (this.currentMessageId !== null) this.messagesWithParts.add(this.currentMessageId);
      return [this.part(event.delta.text)];
    }
    return [];
  }

  /** Text blocks of a complete message, only if no text part of the same `message.id` came before. */
  private assistantMessage(message: Json): StreamJsonEvent[] {
    if (typeof message.id === "string" && this.messagesWithParts.has(message.id)) return [];
    if (!Array.isArray(message.content)) return [];
    const events: StreamJsonEvent[] = [];
    for (const block of message.content) {
      if (!isObject(block) || block.type !== "text" || typeof block.text !== "string" || block.text === "") continue;
      if (this.hasText) this.separatorPending = true;
      events.push(this.part(block.text));
    }
    return events;
  }

  private part(text: string): StreamJsonEvent {
    const withSeparator = this.separatorPending ? BLOCK_SEPARATOR + text : text;
    this.separatorPending = false;
    this.hasText = true;
    return { type: "text", text: withSeparator };
  }
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
