import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DomainError } from "../../src/server/domain-error";
import { toHttpError } from "../../src/server/http/http-error-mapper";
import { PlanNotFoundError, PlanUnreadableError } from "../../src/server/plan/plan-errors";

const fastifyError = (code: string, statusCode: number) => Object.assign(new Error(code), { code, statusCode });

describe("toHttpError", () => {
  it("maps a body above the limit to 413 payload_too_large with the limit", () => {
    expect(toHttpError(fastifyError("FST_ERR_CTP_BODY_TOO_LARGE", 413))).toEqual({
      statusCode: 413,
      body: { error: { code: "payload_too_large", details: { limitBytes: 10 * 1024 * 1024 } } },
    });
  });

  it("maps a zod error to 400 bad_request with the issues", () => {
    const result = z.object({ title: z.string() }).safeParse({});
    const mapped = toHttpError(result.error);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.body.error.code).toBe("bad_request");
    expect(mapped.body.error.details).toEqual({ issues: result.error!.issues });
  });

  it("maps malformed JSON to 400 bad_request", () => {
    expect(toHttpError(fastifyError("FST_ERR_CTP_INVALID_JSON_BODY", 400)).body).toEqual({ error: { code: "bad_request" } });
  });

  it("maps an unsupported content type to 415", () => {
    expect(toHttpError(fastifyError("FST_ERR_CTP_INVALID_MEDIA_TYPE", 415))).toEqual({
      statusCode: 415,
      body: { error: { code: "unsupported_media_type" } },
    });
  });

  it("maps everything else to 500 internal_error without message text", () => {
    expect(toHttpError(new Error("secret detail"))).toEqual({ statusCode: 500, body: { error: { code: "internal_error" } } });
  });

  it("maps PlanUnreadableError to 409 plan_unreadable with title, cause and location (TechSpec 2.0, 2.3, N-10)", () => {
    const location = ".ramifold/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1P1/nodes/01JDQ7Z8M3A6Y2W4X5V7T9R1A2.json";
    expect(toHttpError(new PlanUnreadableError({ title: "Eigenes produktives RAG", cause: "git_conflict", location }))).toEqual({
      statusCode: 409,
      body: { error: { code: "plan_unreadable", details: { title: "Eigenes produktives RAG", cause: "git_conflict", location } } },
    });
  });

  it("maps PlanNotFoundError to 404 plan_not_found with the plan id", () => {
    expect(toHttpError(new PlanNotFoundError("01JDQ7Z8M3A6Y2W4X5V7T9R1P1"))).toEqual({
      statusCode: 404,
      body: { error: { code: "plan_not_found", details: { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P1" } } },
    });
  });

  it.each([
    ["bad_request", 400],
    ["missing_instance_header", 403],
    ["node_not_found", 404],
    ["route_not_found", 404],
    ["plan_read_only", 409],
    ["payload_too_large", 413],
    ["unsupported_media_type", 415],
    ["validation_failed", 422],
    ["save_failed", 500],
    ["internal_error", 500],
  ] as const)("derives the status of a DomainError from its code: %s → %i", (code, statusCode) => {
    expect(toHttpError(new DomainError(code)).statusCode).toBe(statusCode);
  });
});
