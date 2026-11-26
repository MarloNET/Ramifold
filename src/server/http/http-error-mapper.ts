import { ZodError } from "zod";
import type { ErrorBodyDto } from "../../shared/api-schemas";
import type { ErrorCode } from "../../shared/codes";

/** Body limit of all requests (TechSpec 2.0). */
export const BODY_LIMIT_BYTES = 10 * 1024 * 1024;

export type HttpError = { statusCode: number; body: ErrorBodyDto };

export function errorBody(code: ErrorCode, details?: Record<string, unknown>): ErrorBodyDto {
  return details === undefined ? { error: { code } } : { error: { code, details } };
}

/** Maps any error thrown while handling a request to status and error body (TechSpec 2.0). No message texts. */
export function toHttpError(error: unknown): HttpError {
  if (error instanceof ZodError) return { statusCode: 400, body: errorBody("bad_request", { issues: error.issues }) };
  const { code, statusCode } = (error ?? {}) as { code?: unknown; statusCode?: unknown };
  if (code === "FST_ERR_CTP_BODY_TOO_LARGE") {
    return { statusCode: 413, body: errorBody("payload_too_large", { limitBytes: BODY_LIMIT_BYTES }) };
  }
  if (code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") return { statusCode: 415, body: errorBody("unsupported_media_type") };
  if (typeof code === "string" && code.startsWith("FST_ERR_") && statusCode === 400) {
    return { statusCode: 400, body: errorBody("bad_request") };
  }
  return { statusCode: 500, body: errorBody("internal_error") };
}
