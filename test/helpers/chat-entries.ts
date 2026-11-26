import type { ChatEntry } from "../../src/server/context/history-messages";

// Builders for projected chat entries (shape of ChatEntryDto, TechSpec 2.7) in the context unit tests.

let clock = Date.parse("2026-11-24T09:00:00.000Z");
const nextAt = () => new Date((clock += 60_000)).toISOString();

export function question(id: string, text = `question ${id}`, status: "sent" | "not_sent" = "sent"): ChatEntry {
  return { kind: "planner", id, text, at: nextAt(), status };
}

export function answer(
  id: string,
  replyTo: string,
  status: "running" | "complete" | "incomplete" | "aborted" = "complete",
  text = `answer ${id}`,
): ChatEntry & { replyTo: string } {
  return { kind: "ai", id, replyTo, text, at: nextAt(), status, derived: false };
}

/** Derived entry (a) running without `ai_start` or (b) incomplete without any answer line (TechSpec 2.7). */
export function derivedAnswer(
  replyTo: string,
  status: "running" | "incomplete" = "incomplete",
): ChatEntry & { replyTo: string } {
  return { kind: "ai", id: null, replyTo, text: "", at: null, status, derived: true };
}
