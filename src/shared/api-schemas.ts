import { z } from "zod";
import { ERROR_CODES, UNREADABLE_CAUSES } from "./codes";

// Request and response schemas of the HTTP API (TechSpec 2.0 to 2.3). One section per feature.

const isoTimestampSchema = z.iso.datetime({ precision: 3 });
const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);

// Common

export const errorBodySchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorBodyDto = z.infer<typeof errorBodySchema>;

// F-02

export const instanceInfoSchema = z.object({
  instanceId: z.uuid(),
  projectFolder: z.object({
    absolutePath: z.string().min(1),
    displayPath: z.string().min(1),
    name: z.string(),
  }),
  simulated: z.boolean(),
  ramifoldVersion: z.string().min(1),
});
export type InstanceInfoDto = z.infer<typeof instanceInfoSchema>;

// F-03

export const planListItemSchema = z.object({
  planId: ulidSchema,
  title: z.string().nullable(),
  createdAt: isoTimestampSchema.nullable(),
  readable: z.boolean(),
  unreadable: z.object({ cause: z.enum(UNREADABLE_CAUSES), location: z.string() }).nullable(),
});
export type PlanListItemDto = z.infer<typeof planListItemSchema>;

export const planListResponseSchema = z.object({
  plans: z.array(planListItemSchema),
});
export type PlanListResponseDto = z.infer<typeof planListResponseSchema>;

export const treeNodeSchema = z.object({
  id: ulidSchema,
  parentId: ulidSchema.nullable(),
  depth: z.number().int().min(0),
  number: z.string().nullable(),
  title: z.string(),
  resultStatus: z.enum(["open", "concept", "fixed"]),
  childCount: z.number().int().min(0),
  descendantCount: z.number().int().min(0),
  hasAiDraft: z.boolean(),
});
export type TreeNodeDto = z.infer<typeof treeNodeSchema>;

export const readOnlyInfoSchema = z.object({ cause: z.literal("external_change"), detectedAt: isoTimestampSchema });
export type ReadOnlyInfoDto = z.infer<typeof readOnlyInfoSchema>;

/** GET /api/plans/:planId; `nodes` in tree order (pre-order). */
export const planViewSchema = z.object({
  planId: ulidSchema,
  title: z.string(),
  createdAt: isoTimestampSchema,
  readOnly: readOnlyInfoSchema.nullable(),
  nodes: z.array(treeNodeSchema),
});
export type PlanViewDto = z.infer<typeof planViewSchema>;
