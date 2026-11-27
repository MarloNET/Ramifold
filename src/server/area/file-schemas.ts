import { z } from "zod";
import { CAUSE_CODES } from "../../shared/codes";

// zod schemas of the files in the Ramifold area (TechSpec 3.1).

const isoTimestampSchema = z.iso.datetime({ precision: 3 });
const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const formatSchema = z.number().int().min(1);

/** `.ramifold/area.json`; a format above 1 is valid JSON but stops the start (TERM-011). */
export const areaFileSchema = z.object({
  format: formatSchema,
  createdAt: isoTimestampSchema,
});
export type AreaFile = z.infer<typeof areaFileSchema>;

/** `plans/<planId>/plan.json` */
export const planFileSchema = z.object({
  format: formatSchema,
  id: ulidSchema,
  createdAt: isoTimestampSchema,
  profile: z.literal("software"),
});
export type PlanFile = z.infer<typeof planFileSchema>;

/** `plans/<planId>/nodes/<nodeId>.json`; unknown fields are kept (REQ-065). */
export const nodeFileSchema = z.looseObject({
  id: ulidSchema,
  parentId: ulidSchema.nullable(),
  position: z.string().regex(/^[0-9A-Za-z]+$/),
  title: z.string(),
  objective: z.string(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type NodeFile = z.infer<typeof nodeFileSchema>;

/** `plans/<planId>/results/<nodeId>/<versionId>.json` (only created, never changed). */
export const resultVersionFileSchema = z.looseObject({
  id: ulidSchema,
  nodeId: ulidSchema,
  status: z.enum(["concept", "fixed"]),
  content: z.string().refine((content) => content.trim() !== ""),
  createdAt: isoTimestampSchema,
});
export type ResultVersionFile = z.infer<typeof resultVersionFileSchema>;

/** First line of `plans/<planId>/chats/<chatId>.jsonl`: assigns the chat to its node. */
export const chatHeaderLineSchema = z.looseObject({
  t: z.literal("chat"),
  id: ulidSchema,
  nodeId: ulidSchema,
  createdAt: isoTimestampSchema,
});
export type ChatHeaderLine = z.infer<typeof chatHeaderLineSchema>;

/** The event lines after the header; lines with an unknown `t` are ignored when read (REQ-065). */
export const chatEventLineSchema = z.discriminatedUnion("t", [
  z.looseObject({ t: z.literal("planner_message"), id: ulidSchema, text: z.string(), at: isoTimestampSchema }),
  z.looseObject({
    t: z.literal("planner_status"),
    id: ulidSchema,
    status: z.enum(["sent", "not_sent"]),
    cause: z.enum(CAUSE_CODES).optional(),
    at: isoTimestampSchema,
  }),
  z.looseObject({
    t: z.literal("ai_start"),
    id: ulidSchema,
    replyTo: ulidSchema,
    sessionRebuilt: z.boolean(),
    at: isoTimestampSchema,
  }),
  z.looseObject({ t: z.literal("ai_text"), id: ulidSchema, text: z.string() }),
  z.looseObject({
    t: z.literal("ai_end"),
    id: ulidSchema,
    status: z.enum(["complete", "incomplete", "aborted"]),
    cause: z.enum(CAUSE_CODES).optional(),
    at: isoTimestampSchema,
  }),
]);
export type ChatEventLine = z.infer<typeof chatEventLineSchema>;

/** Values of `t` with a known meaning after the header line. */
export const CHAT_EVENT_TYPES: readonly string[] = [
  "planner_message",
  "planner_status",
  "ai_start",
  "ai_text",
  "ai_end",
];

// Machine-local files in `.ramifold/local/` (TechSpec 3.2).

/** A session id that does not match counts as missing and is never passed to Claude Code (TechSpec 2.6, 3.2). */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/**
 * One entry of `sessions.json`. `knownThroughMessageId` may be missing (entry from a state before v0.10: the session
 * does not know the chat); unknown fields are allowed (TechSpec 2.8).
 */
export const sessionEntrySchema = z.looseObject({
  agent: z.string(),
  sessionId: z.string().regex(SESSION_ID_PATTERN),
  contextFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  historyThroughMessageId: ulidSchema.nullable(),
  knownThroughMessageId: ulidSchema.optional(),
  updatedAt: isoTimestampSchema,
});
export type SessionEntry = z.infer<typeof sessionEntrySchema>;

/** `local/sessions.json`: entries per chat id; each entry is checked on its own when read. */
export const sessionsFileSchema = z.looseObject({ sessions: z.record(z.string(), z.unknown()) });

/** `.ramifold/local/instance.lock` (TechSpec 3.2) */
export const instanceLockFileSchema = z.object({
  pid: z.number().int().positive(),
  port: z.number().int().min(1).max(65535),
  instanceId: z.uuid(),
  projectFolder: z.string().min(1),
  startedAt: isoTimestampSchema,
});
export type InstanceLockFile = z.infer<typeof instanceLockFileSchema>;
