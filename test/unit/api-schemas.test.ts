import { describe, expect, it } from "vitest";
import { errorBodySchema, instanceInfoSchema, planListResponseSchema } from "../../src/shared/api-schemas";
import { connectedEventSchema, formatSseEvent } from "../../src/shared/sse-events";

describe("apiSchemas", () => {
  it("accepts the instance info of TechSpec 2.2", () => {
    const info = {
      instanceId: "6f9619ff-8b86-4011-b42d-00c04fc964ff",
      projectFolder: { absolutePath: "/home/p/code/rag", displayPath: "~/code/rag", name: "rag" },
      simulated: true,
      ramifoldVersion: "0.0.0-dev",
    };
    expect(instanceInfoSchema.parse(info)).toEqual(info);
    expect(instanceInfoSchema.safeParse({ ...info, instanceId: "x" }).success).toBe(false);
  });

  it("accepts a plan list and rejects malformed items", () => {
    const item = {
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      title: "Eigenes produktives RAG",
      createdAt: "2026-11-03T10:00:00.000Z",
      readable: true,
      unreadable: null,
    };
    expect(planListResponseSchema.safeParse({ plans: [item] }).success).toBe(true);
    expect(planListResponseSchema.safeParse({ plans: [] }).success).toBe(true);
    expect(planListResponseSchema.safeParse({ plans: [{ ...item, planId: "1" }] }).success).toBe(false);
    expect(planListResponseSchema.safeParse({ plans: [{ ...item, createdAt: "Nov 3" }] }).success).toBe(false);
    expect(planListResponseSchema.safeParse({}).success).toBe(false);
  });

  it("accepts only known error codes in error bodies", () => {
    expect(errorBodySchema.safeParse({ error: { code: "unsupported_media_type" } }).success).toBe(true);
    expect(errorBodySchema.safeParse({ error: { code: "save_failed", details: { cause: "disk_full" } } }).success).toBe(true);
    expect(errorBodySchema.safeParse({ error: { code: "teapot" } }).success).toBe(false);
  });
});

describe("sseEvents", () => {
  it("validates the connected event and formats it as `event:` and `data:` lines", () => {
    const data = {
      instanceId: "6f9619ff-8b86-4011-b42d-00c04fc964ff",
      windowId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      aiRequest: null,
      agent: { status: "checking", version: null },
      simulated: false,
    };
    expect(connectedEventSchema.parse(data)).toEqual(data);
    expect(formatSseEvent("connected", data)).toBe(`event: connected\ndata: ${JSON.stringify(data)}\n\n`);
  });
});
