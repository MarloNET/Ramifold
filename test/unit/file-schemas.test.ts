import { describe, expect, it } from "vitest";
import { areaFileSchema, nodeFileSchema, planFileSchema } from "../../src/server/area/file-schemas";

describe("fileSchemas", () => {
  it("accepts area.json with format 1 and an ISO timestamp", () => {
    expect(areaFileSchema.safeParse({ format: 1, createdAt: "2026-11-24T09:42:00.000Z" }).success).toBe(true);
  });

  it.each([
    ["missing format", { createdAt: "2026-11-24T09:42:00.000Z" }],
    ["format as string", { format: "1", createdAt: "2026-11-24T09:42:00.000Z" }],
    ["format 0", { format: 0, createdAt: "2026-11-24T09:42:00.000Z" }],
    ["fractional format", { format: 1.5, createdAt: "2026-11-24T09:42:00.000Z" }],
    ["missing createdAt", { format: 1 }],
    ["createdAt not ISO", { format: 1, createdAt: "yesterday" }],
  ])("rejects area.json with %s", (_name, value) => {
    expect(areaFileSchema.safeParse(value).success).toBe(false);
  });

  it("accepts a higher format so that the start check can report a newer version", () => {
    expect(areaFileSchema.safeParse({ format: 2, createdAt: "2026-11-24T09:42:00.000Z" }).success).toBe(true);
  });

  it("validates plan.json fields", () => {
    const plan = { format: 1, id: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS", createdAt: "2026-11-03T10:00:00.000Z", profile: "software" };
    expect(planFileSchema.safeParse(plan).success).toBe(true);
    expect(planFileSchema.safeParse({ ...plan, id: "not-a-ulid" }).success).toBe(false);
    expect(planFileSchema.safeParse({ ...plan, profile: "other" }).success).toBe(false);
  });

  it("validates node files and keeps unknown fields", () => {
    const node = {
      id: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      parentId: null,
      position: "a0",
      title: "Eigenes produktives RAG",
      objective: "",
      createdAt: "2026-11-03T10:00:00.000Z",
      updatedAt: "2026-11-03T10:00:00.000Z",
      futureField: { x: 1 },
    };
    const parsed = nodeFileSchema.parse(node);
    expect(parsed).toEqual(node);
    expect(nodeFileSchema.safeParse({ ...node, position: "a-0" }).success).toBe(false);
  });
});
