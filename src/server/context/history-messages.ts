// Relevant messages of a chat (TechSpec 2.8 "Maßgebliche Nachrichten", H-11): the only source for renderHistory and
// for the check "the session knows the chat" in planSession, so that both never drift apart.

/** The fields of a projected chat entry (`ChatEntryDto`, TechSpec 2.7) that the history needs. */
export type ChatEntry =
  | { kind: "planner"; id: string; text: string; at: string; status: "sent" | "not_sent" }
  | {
      kind: "ai";
      id: string | null;
      text: string;
      at: string | null;
      status: "running" | "complete" | "incomplete" | "aborted";
      derived: boolean;
    };

export type HistoryMessage =
  | { from: "planner"; id: string; text: string; at: string }
  | { from: "ai"; id: string; text: string; at: string | null; status: "running" | "complete" | "incomplete" | "aborted" };

/**
 * Questions with status `sent` and answers with their own `ai_start` line (every status), in chat order; leaves out
 * questions with `not_sent` and derived entries.
 */
export function selectHistoryMessages(entries: readonly ChatEntry[]): HistoryMessage[] {
  const messages: HistoryMessage[] = [];
  for (const entry of entries) {
    if (entry.kind === "planner") {
      if (entry.status === "sent") messages.push({ from: "planner", id: entry.id, text: entry.text, at: entry.at });
    } else if (!entry.derived && entry.id !== null) {
      messages.push({ from: "ai", id: entry.id, text: entry.text, at: entry.at, status: entry.status });
    }
  }
  return messages;
}

/** Id of the last relevant message of the given entries, null if there is none. */
export function lastHistoryMessageId(entries: readonly ChatEntry[]): string | null {
  return selectHistoryMessages(entries).at(-1)?.id ?? null;
}
