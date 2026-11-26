import { z } from "zod";

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
