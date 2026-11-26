// Error codes, cause codes, write causes and unreadable causes (TechSpec 2.0, 2.3, 2.6, CC-12).
// Changes only together with a specification change (TechSpec 4.4).

export const ERROR_CODES = [
  "bad_request",
  "missing_instance_header",
  "forbidden_origin",
  "plan_not_found",
  "node_not_found",
  "suggestion_not_found",
  "ai_request_not_found",
  "instance_mismatch",
  "plan_unreadable",
  "plan_read_only",
  "ai_request_running",
  "consent_required",
  "agent_unavailable",
  "result_locked",
  "replace_confirmation_required",
  "not_resendable",
  "move_not_possible",
  "root_not_deletable",
  "payload_too_large",
  "unsupported_media_type",
  "validation_failed",
  "save_failed",
  "internal_error",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** The 14 cause codes of an incomplete AI request (TechSpec 2.6, CC-12). */
export const CAUSE_CODES = [
  "aborted_by_planner",
  "instance_stopped",
  "timeout",
  "agent_not_found",
  "agent_protocol",
  "not_authenticated",
  "usage_limit",
  "network",
  "provider_error",
  "unknown",
  "agent_exited",
  "unusable_result",
  "external_change",
  "node_deleted",
] as const;
export type CauseCode = (typeof CAUSE_CODES)[number];

/** Causes of `500 save_failed` (TechSpec 2.0). */
export const WRITE_CAUSES = ["no_permission", "read_only_file_system", "disk_full", "file_system_error"] as const;
export type WriteCause = (typeof WRITE_CAUSES)[number];

/** Causes of an unreadable plan (TechSpec 2.3). */
export const UNREADABLE_CAUSES = ["newer_version", "git_conflict", "damaged", "inconsistent"] as const;
export type UnreadableCause = (typeof UNREADABLE_CAUSES)[number];
