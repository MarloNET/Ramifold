import {
  CAUSE_CODES,
  STARTUP_FAILURE_CAUSES,
  UNREADABLE_CAUSES,
  WRITE_CAUSES,
  type CauseCode,
  type ErrorKind,
  type StartupFailureCause,
  type UnreadableCause,
  type WriteCause,
} from "../../shared/codes";
import { aiRequestInfoSchema, type AiRequestInfo } from "../../shared/sse-events";
import type { ErrorLogEntry } from "../area/error-log";
import type { TerminalOutput } from "../cli/terminal-output";
import { isoNow, type Clock } from "../clock";

// Error reporting of TechSpec 2.14 (REQ-063): per case exactly one line on stderr and, if `.ramifold/local/` exists
// and is writable, exactly one entry in `local/errors.log`. Rejections by fixed rules (REQ-069, REQ-071, REQ-074,
// second start) are no error cases; callers do not report them.

type NodeRef = { nodeId: string; nodeNumber: string | null } | { nodeId?: undefined; nodeNumber?: undefined };

export type AiRequestKind = AiRequestInfo["kind"];

/** One case per kind with the fields of TechSpec 2.14. Only ids, numbers, codes, exit codes, signals, errno codes and paths in the area. */
export type ErrorReport =
  | { kind: "startup_failed"; cause: StartupFailureCause }
  | {
      kind: "ai_request_failed";
      cause: CauseCode;
      planId: string;
      nodeId: string;
      nodeNumber: string | null;
      requestKind: AiRequestKind;
      /** `exit=<code>` or `signal=<sig>` */
      detail?: string;
    }
  | { kind: "ai_session_rebuilt"; planId: string; nodeId: string; nodeNumber: string | null }
  | ({ kind: "save_failed"; cause: WriteCause; planId?: string; /** errno code, e.g. `ENOSPC` */ detail?: string } & NodeRef)
  | { kind: "plan_unreadable"; cause: UnreadableCause; planId: string; /** path in the area relative to the project folder */ detail?: string }
  | { kind: "internal_error"; /** error class name, never the message text */ detail: string };

export type ErrorLogPort = { append(entry: ErrorLogEntry): Promise<boolean> };

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const NODE_NUMBER = /^[1-9]\d*(?:\.[1-9]\d*)*$/;
const REQUEST_KINDS: readonly string[] = aiRequestInfoSchema.shape.kind.options;

const CAUSES: Record<ErrorKind, readonly string[]> = {
  startup_failed: STARTUP_FAILURE_CAUSES,
  ai_request_failed: CAUSE_CODES,
  ai_session_rebuilt: [],
  save_failed: WRITE_CAUSES,
  plan_unreadable: UNREADABLE_CAUSES,
  internal_error: [],
};

/** Allowed shape of `detail` per kind (TechSpec 2.14). */
const DETAIL: Record<ErrorKind, RegExp | null> = {
  startup_failed: null,
  ai_request_failed: /^(?:exit=\d{1,3}|signal=SIG[A-Z0-9]{1,12})$/,
  ai_session_rebuilt: null,
  save_failed: /^E[A-Z0-9]{1,15}$/,
  plan_unreadable: /^\.ramifold(?:\/(?!\.\.?(?:\/|$))[A-Za-z0-9._-]{1,128}){1,8}$/,
  internal_error: /^[A-Za-z_$][\w$]{0,99}$/,
};

export class ErrorReporter {
  constructor(
    private readonly deps: {
      terminal: Pick<TerminalOutput, "errorLine">;
      clock: Clock;
      /** null while the project folder or the area is not known yet; then only the terminal line is written. */
      errorLog: ErrorLogPort | null;
    },
  ) {}

  /** Writes the terminal line first, then the log entry; never throws. */
  async report(report: ErrorReport): Promise<void> {
    const entry = toEntry(isoNow(this.deps.clock), report);
    this.deps.terminal.errorLine(formatLine(entry));
    await this.deps.errorLog?.append(entry).catch(() => false);
  }
}

/**
 * Keeps only values that are ids, numbers or codes of the kind; anything else (for example content text passed by
 * mistake) is left out, so that neither line nor entry can contain content text (REQ-063).
 */
function toEntry(at: string, report: ErrorReport): ErrorLogEntry {
  const r = report as Partial<Record<keyof ErrorLogEntry, unknown>>;
  const kind = report.kind;
  const entry: ErrorLogEntry = { at, kind };
  if (typeof r.cause === "string" && CAUSES[kind].includes(r.cause)) entry.cause = r.cause;
  if (typeof r.planId === "string" && ULID.test(r.planId)) entry.planId = r.planId;
  const validNumber = r.nodeNumber === null || (typeof r.nodeNumber === "string" && NODE_NUMBER.test(r.nodeNumber));
  if (typeof r.nodeId === "string" && ULID.test(r.nodeId) && validNumber) {
    entry.nodeId = r.nodeId;
    entry.nodeNumber = r.nodeNumber as string | null;
  }
  if (typeof r.requestKind === "string" && REQUEST_KINDS.includes(r.requestKind)) entry.requestKind = r.requestKind;
  if (typeof r.detail === "string" && DETAIL[kind]?.test(r.detail)) entry.detail = r.detail;
  return entry;
}

/** `[ramifold] <at> <kind> cause=<cause> plan=<planId> node=<nodeNumber or root>/<nodeId> <detail>`; missing parts are left out. */
function formatLine(entry: ErrorLogEntry): string {
  const parts = ["[ramifold]", entry.at, entry.kind];
  if (entry.cause !== undefined) parts.push(`cause=${entry.cause}`);
  if (entry.planId !== undefined) parts.push(`plan=${entry.planId}`);
  if (entry.nodeId !== undefined) parts.push(`node=${entry.nodeNumber ?? "root"}/${entry.nodeId}`);
  if (entry.detail !== undefined) parts.push(entry.detail);
  return parts.join(" ");
}
