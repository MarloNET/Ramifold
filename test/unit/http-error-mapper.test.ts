import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toHttpError } from "../../src/server/http/http-error-mapper";

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
});
