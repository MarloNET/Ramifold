import fsp from "node:fs/promises";
import type { ErrorKind } from "../../shared/codes";
import type { AreaPaths } from "./area-paths";
import { writeAndSync } from "./atomic-write";

export type ErrorLogFs = Pick<typeof fsp, "open">;

/** One line of `local/errors.log` (TechSpec 2.14, 3.2): `at`, `kind` and the fields of the kind, never content text. */
export type ErrorLogEntry = {
  at: string;
  kind: ErrorKind;
  cause?: string;
  planId?: string;
  nodeId?: string;
  nodeNumber?: string | null;
  requestKind?: string;
  detail?: string;
};

/** Whitelist of the entry fields in their written order; any other property is never written (REQ-063). */
const ENTRY_FIELDS = ["at", "kind", "cause", "planId", "nodeId", "nodeNumber", "requestKind", "detail"] as const;

/**
 * Appends entries to `.ramifold/local/errors.log` (REQ-063). Writes only if `local/` exists and is writable:
 * `open(…, "a")` creates at most `errors.log` itself and never a folder, so a missing or read-only area gets no file.
 */
export class ErrorLog {
  constructor(
    private readonly paths: AreaPaths,
    private readonly fs: ErrorLogFs = fsp,
  ) {}

  /** One JSON line in one write call, then fsync. Never throws; returns whether the entry was written. */
  async append(entry: ErrorLogEntry): Promise<boolean> {
    const line: Partial<ErrorLogEntry> = {};
    for (const field of ENTRY_FIELDS) {
      if (entry[field] !== undefined) Object.assign(line, { [field]: entry[field] });
    }
    try {
      await writeAndSync(this.fs, this.paths.errorsLog, `${JSON.stringify(line)}\n`, "a");
      return true;
    } catch {
      return false;
    }
  }
}
