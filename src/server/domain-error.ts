import type { ErrorCode } from "../shared/codes";

/**
 * Base class of all domain errors (TechSpec 4.2, 4.3, v0.15, N-10): carries the error code and optional details, no
 * HTTP status; only `toHttpError` derives the status from the code (TechSpec 2.0). No message text for the planner.
 */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = new.target.name;
  }
}
