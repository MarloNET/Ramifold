import { z } from "zod";

// Server-sent events of GET /api/events (TechSpec 2.0). The walking skeleton sends only `connected`;
// the AI request events follow with F-06/F-07.

export const aiRequestInfoSchema = z.object({
  requestId: z.string(),
  planId: z.string(),
  nodeId: z.string(),
  nodeNumber: z.string().nullable(),
  nodeTitle: z.string(),
  kind: z.enum(["chat", "suggest", "summarize"]),
});
export type AiRequestInfo = z.infer<typeof aiRequestInfoSchema>;

export const connectedEventSchema = z.object({
  instanceId: z.uuid(),
  windowId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
  aiRequest: aiRequestInfoSchema.nullable(),
  agent: z.object({
    status: z.enum(["ok", "not_found", "too_old", "checking"]),
    version: z.string().nullable(),
  }),
  simulated: z.boolean(),
});
export type ConnectedEvent = z.infer<typeof connectedEventSchema>;

export const SSE_EVENT_CONNECTED = "connected";

/** Serializes one event in the SSE wire format: `event: <name>` and `data: <JSON>`. */
export function formatSseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}
