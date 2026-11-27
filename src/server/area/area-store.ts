import { constants } from "node:fs";
import fsp from "node:fs/promises";
import type { AreaPaths } from "./area-paths";
import { syncFolder, writeAndSync } from "./atomic-write";
import type { SessionEntry } from "./file-schemas";
import { LocalStateFiles } from "./local-state-files";
import { loadPlanFromDisk } from "./plan-loader";
import { PlanStamp } from "./plan-stamp";
import type { PlanTreeCheck } from "./plan-validator";

// The only interface to the files in `.ramifold/` (TechSpec 4.3, REQ-052), plus the check of the project folder
// itself (start step 3), because only `area` may use node:fs (TechSpec 4.1).

export type ProjectFolderCheck =
  | { status: "ok"; canonicalPath: string }
  | { status: "missing" | "not_a_folder" | "not_writable" };

/** Start step 3: `stat`, `access(W_OK | X_OK)`, then `realpath` (TechSpec 2.1). */
export async function inspectProjectFolder(absolutePath: string): Promise<ProjectFolderCheck> {
  let stats;
  try {
    stats = await fsp.stat(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { status: "missing" };
    throw error;
  }
  if (!stats.isDirectory()) return { status: "not_a_folder" };
  try {
    await fsp.access(absolutePath, constants.W_OK | constants.X_OK);
  } catch {
    return { status: "not_writable" };
  }
  return { status: "ok", canonicalPath: await fsp.realpath(absolutePath) };
}

export class AreaStore {
  constructor(
    private readonly paths: AreaPaths,
    private readonly localState: LocalStateFiles = new LocalStateFiles(paths),
  ) {}

  /** Session entry of a chat from `local/sessions.json` (TechSpec 2.8, 3.2); null if missing or invalid. */
  readSessionEntry(chatId: string): Promise<SessionEntry | null> {
    return this.localState.readSession(chatId);
  }

  /** Writes the session entry of a chat atomically; if writing fails, the previous entry stays (TechSpec 2.7). */
  writeSessionEntry(chatId: string, entry: SessionEntry): Promise<void> {
    return this.localState.writeSession(chatId, entry);
  }

  /**
   * Names of the entries in `plans/` that can be plans, sorted: folders and symbolic links (never followed; a link is
   * unreadable by rule 0, TechSpec 2.3) with a plan id as name. Read anew on every listing.
   */
  async listPlanFolders(): Promise<string[]> {
    let entries;
    try {
      entries = await fsp.readdir(this.paths.plans, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    return entries
      .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && PLAN_ID.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  }

  /** Raw text of `local/instance.lock`; null if the file does not exist. Other read errors are passed on. */
  async readInstanceLock(): Promise<string | null> {
    try {
      return await fsp.readFile(this.paths.instanceLock, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  /**
   * Creates `local/instance.lock` exclusively (`wx`), writes the content and fsyncs it (start step 7, TechSpec 2.1).
   * Rejects with EEXIST if the file exists; after any other error no lock file stays behind.
   */
  async createInstanceLock(content: string): Promise<void> {
    const file = this.paths.instanceLock;
    try {
      await writeAndSync(fsp, file, content, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") await fsp.unlink(file).catch(() => undefined);
      throw error;
    }
    await syncFolder(fsp, this.paths.local);
  }

  /** Deletes `local/instance.lock`; a missing file is fine. */
  async deleteInstanceLock(): Promise<void> {
    try {
      await fsp.unlink(this.paths.instanceLock);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  /**
   * Loads a plan completely and checks it (TechSpec 2.3); the file stamp is recorded before reading, so that a change
   * during loading shows up as a deviation (TechSpec 2.12). null if the folder has no `plan.json` (aborted creation).
   */
  async loadPlan(planId: string): Promise<{ check: PlanTreeCheck; stamp: PlanStamp } | null> {
    const stamp = await PlanStamp.capture(this.paths.planDir(planId));
    const check = await loadPlanFromDisk(this.paths, planId);
    return check === null ? null : { check, stamp };
  }
}

const PLAN_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
