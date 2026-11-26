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
