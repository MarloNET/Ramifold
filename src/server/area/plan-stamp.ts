import fsp from "node:fs/promises";
import path from "node:path";

// File stamp of a plan (TechSpec 2.12, ADR-006, REQ-074): relative path -> {size, mtimeMs, ctimeMs, ino} for all files
// under `plans/<planId>/` recursively, without `PLAN.md` and without files with `.tmp-` in the name. Links are
// recorded with `lstat` and never followed.

export type StampEntry = { size: number; mtimeMs: number; ctimeMs: number; ino: number };

const EXPORT_FILE = "PLAN.md";

export class PlanStamp {
  private constructor(
    private readonly planDir: string,
    private readonly entries: Map<string, StampEntry>,
  ) {}

  /** Records the stamp of all files of the plan folder; a linked plan folder is not followed and has no entries. */
  static async capture(planDir: string): Promise<PlanStamp> {
    const isLink = await fsp.lstat(planDir).then(
      (stats) => stats.isSymbolicLink(),
      () => false,
    );
    return new PlanStamp(planDir, isLink ? new Map() : await scan(planDir));
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const dirent of dirents) {
      const relPath = relDir === "" ? dirent.name : `${relDir}/${dirent.name}`;
      if (isIgnored(relPath)) continue;
      if (dirent.isDirectory()) await walk(relPath);
      else entries.set(relPath, toEntry(await fsp.lstat(path.join(planDir, relPath))));
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
