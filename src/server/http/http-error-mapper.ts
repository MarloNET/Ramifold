import { ZodError } from "zod";
import type { ErrorBodyDto } from "../../shared/api-schemas";
import type { ErrorCode } from "../../shared/codes";
import { DomainError } from "../domain-error";

/** Body limit of all requests (TechSpec 2.0). */
export const BODY_LIMIT_BYTES = 10 * 1024 * 1024;

export type HttpError = { statusCode: number; body: ErrorBodyDto };

export function errorBody(code: ErrorCode, details?: Record<string, unknown>): ErrorBodyDto {
  return details === undefined ? { error: { code } } : { error: { code, details } };
}

/** HTTP status per error code (TechSpec 2.0). */
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  missing_instance_header: 403,
  forbidden_origin: 403,
  plan_not_found: 404,
  node_not_found: 404,
  suggestion_not_found: 404,
  ai_request_not_found: 404,
  route_not_found: 404,
  instance_mismatch: 409,
  plan_unreadable: 409,
  plan_read_only: 409,
  ai_request_running: 409,
  consent_required: 409,
  agent_unavailable: 409,
  result_locked: 409,
  replace_confirmation_required: 409,
  not_resendable: 409,
  move_not_possible: 409,
  root_not_deletable: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  validation_failed: 422,
  save_failed: 500,
  internal_error: 500,
};

/** Maps any error thrown while handling a request to status and error body (TechSpec 2.0). No message texts. */
export function toHttpError(error: unknown): HttpError {
  if (error instanceof DomainError) {
    return { statusCode: STATUS_BY_CODE[error.code], body: errorBody(error.code, error.details) };
  }
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
