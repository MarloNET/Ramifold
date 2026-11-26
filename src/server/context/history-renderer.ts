import type { HistoryMessage } from "./history-messages";

/**
 * Element `<previous-conversation>` of the context text (TechSpec 2.8). AI answers carry their status; attribute
 * values are escaped, contents stay unchanged. Without messages the element is left out (empty string).
 */
export function renderHistory(messages: readonly HistoryMessage[]): string {
  if (messages.length === 0) return "";
  const lines = messages.map((message) => {
    const at = message.at === null ? "" : ` at="${escapeAttribute(message.at)}"`;
    const status = message.from === "ai" ? ` status="${escapeAttribute(message.status)}"` : "";
    return `<message from="${message.from}"${at}${status}>${message.text}</message>`;
  });
  return ["<previous-conversation>", ...lines, "</previous-conversation>"].join("\n");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
