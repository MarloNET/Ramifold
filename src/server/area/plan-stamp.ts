import fsp from "node:fs/promises";
import path from "node:path";
import type { AreaPaths } from "./area-paths";
import { findSymlink } from "./symlink-guard";

// File stamp of a plan (TechSpec 2.12, ADR-006, REQ-074): relative path -> {size, mtimeMs, ctimeMs, ino} for all files
// under `plans/<planId>/` recursively, without `PLAN.md` and without files with `.tmp-` in the name. Links are
// recorded with `lstat` and never followed; a link on the path to the plan folder is found by symlinkGuard (TechSpec
// 4.3). A folder that cannot be read has no entries, so that one plan never breaks the listing of the others.

export type StampEntry = { size: number; mtimeMs: number; ctimeMs: number; ino: number };

const EXPORT_FILE = "PLAN.md";

export class PlanStamp {
  private constructor(
    private readonly planDir: string,
    private readonly entries: Map<string, StampEntry>,
  ) {}

  /** Records the stamp of all files of the plan folder; with a link on the way there it is not followed, no entries. */
  static async capture(paths: AreaPaths, planId: string): Promise<PlanStamp> {
    const planDir = paths.planDir(planId);
    const link = await findSymlink(paths.root, path.posix.join("plans", planId)).catch(() => planDir);
    return new PlanStamp(planDir, link !== null ? new Map() : await scan(planDir));
  }

  /** Recorded relative paths (with `/`), sorted. */
  paths(): string[] {
    return [...this.entries.keys()].sort();
  }

  /** Only reading: same path set and same values per path as on disk now. */
  async matchesDisk(): Promise<boolean> {
    const current = await scan(this.planDir);
    if (current.size !== this.entries.size) return false;
    for (const [relPath, entry] of this.entries) {
      const other = current.get(relPath);
      if (other === undefined || !sameEntry(entry, other)) return false;
    }
    return true;
  }

  /** Takes over own writes, appends, truncations and deletions of the given paths; deleted paths are removed. */
  async refresh(relPaths: string[]): Promise<void> {
    for (const relPath of relPaths) {
      if (isIgnored(relPath)) continue;
      try {
        this.entries.set(relPath, toEntry(await fsp.lstat(path.join(this.planDir, relPath))));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        this.entries.delete(relPath);
      }
    }
  }
}

async function scan(planDir: string): Promise<Map<string, StampEntry>> {
  const entries = new Map<string, StampEntry>();
  const walk = async (relDir: string): Promise<void> => {
    let dirents;
    try {
      dirents = await fsp.readdir(path.join(planDir, relDir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      const relPath = relDir === "" ? dirent.name : `${relDir}/${dirent.name}`;
      if (isIgnored(relPath)) continue;
      if (dirent.isDirectory()) await walk(relPath);
      else {
        const stats = await fsp.lstat(path.join(planDir, relPath)).catch(() => null);
        if (stats !== null) entries.set(relPath, toEntry(stats));
      }
    }
  };
  await walk("");
  return entries;
}

function isIgnored(relPath: string): boolean {
  return relPath === EXPORT_FILE || path.posix.basename(relPath).includes(".tmp-");
}

function toEntry(stats: { size: number; mtimeMs: number; ctimeMs: number; ino: number }): StampEntry {
  return { size: stats.size, mtimeMs: stats.mtimeMs, ctimeMs: stats.ctimeMs, ino: stats.ino };
}

function sameEntry(a: StampEntry, b: StampEntry): boolean {
  return a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs && a.ino === b.ino;
}
