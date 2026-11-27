import { randomBytes } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Clock } from "../clock";
import type { AreaPaths } from "./area-paths";
import { syncFolder, writeAndSync, writeFileAtomic, writeJsonFileAtomic } from "./atomic-write";
import { areaFileSchema } from "./file-schemas";
import { findSymlink, findSymlinkInFolder } from "./symlink-guard";

export type AreaFs = Pick<typeof fsp, "mkdir" | "open" | "link" | "rename" | "unlink" | "readFile" | "access">;

/** Result of start step 5; `path` is the one the terminal line names (TERM-010: area.json, TERM-011: .ramifold). */
export type AreaCheck = { status: "ok" } | { status: "damaged"; path: string } | { status: "newer_version"; path: string };

// Contents fixed by TechSpec 2.14 ("Regel je Datei").
export const AREA_GITIGNORE_CONTENT =
  '# Created once by Ramifold. Delete the line "plans/*/chats/" to include chats in Git.\nlocal/\n*.tmp-*\nplans/*/chats/\n';
export const LOCAL_GITIGNORE_CONTENT = "*\n";
export const AREA_FORMAT = 1;

/** `link` errors that mean "no hard links on this file system" and lead to the fallback (FIND-037). */
const NO_HARD_LINK_CODES = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP"]);

/**
 * Creates the Ramifold area on the first start and completes the machine-local parts on every start
 * (start step 7, TechSpec 2.1 and 2.14). Errors are passed on; the caller reports TERM-002.
 */
export class AreaInitializer {
  constructor(
    private readonly paths: AreaPaths,
    private readonly clock: Clock,
    private readonly fs: AreaFs = fsp,
  ) {}

  /**
   * Start step 5 (TechSpec 2.1, CC-04), read-only: an existing area is damaged if area.json is missing although
   * plans/ exists, or if area.json cannot be read, has conflict markers (not parsable) or violates the schema; a
   * format above 1 comes from a newer Ramifold version. No area at all is fine; step 7 creates it. Before that, a
   * symbolic link in the area damages it, named with its own path (N-06).
   */
  async checkArea(): Promise<AreaCheck> {
    const p = this.paths;
    const damaged: AreaCheck = { status: "damaged", path: p.areaJson };
    let link: string | null;
    try {
      link = await findAreaSymlink(p.root);
    } catch {
      return damaged;
    }
    if (link !== null) return { status: "damaged", path: link };
    if (!(await this.exists(p.root))) return { status: "ok" };
    let text: string;
    try {
      text = await this.fs.readFile(p.areaJson, "utf8");
    } catch (error) {
      if (errorCode(error) !== "ENOENT") return damaged;
      return (await this.exists(p.plans)) ? damaged : { status: "ok" };
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return damaged;
    }
    if (isNewerFormat(data)) return { status: "newer_version", path: p.root };
    return areaFileSchema.safeParse(data).success ? { status: "ok" } : damaged;
  }

  async ensureArea(): Promise<void> {
    const p = this.paths;
    const firstCreation = !(await this.exists(p.areaJson));

    await this.ensureFolder(p.root);
    await this.ensureFolder(p.local);
    await this.ensureFolder(p.localTmp);
    if (!(await this.exists(p.localGitignore))) {
      await writeFileAtomic(p.localGitignore, LOCAL_GITIGNORE_CONTENT, this.fs);
    }
    if (firstCreation) {
      await this.createAreaGitignoreOnce();
      const areaJson = { format: AREA_FORMAT, createdAt: this.clock.now().toISOString() };
      await writeJsonFileAtomic(p.areaJson, areaJson, this.fs);
    }
    // plans/ always comes after area.json, so an aborted creation never looks damaged (FIND-036).
    await this.ensureFolder(p.plans);
  }

  /** Exclusive and atomic: temp file, fsync, `link` onto the target name; an existing file stays. */
  private async createAreaGitignoreOnce(): Promise<void> {
    const target = this.paths.gitignore;
    const tempFile = `${target}.tmp-${randomBytes(4).toString("hex")}`;
    let useFallback = false;
    try {
      await writeAndSync(this.fs, tempFile, AREA_GITIGNORE_CONTENT, "wx");
      await this.fs.link(tempFile, target);
    } catch (error) {
      const code = errorCode(error);
      if (code !== undefined && NO_HARD_LINK_CODES.has(code)) useFallback = true;
      else if (code !== "EEXIST") {
        await this.fs.unlink(tempFile).catch(() => undefined);
        throw error;
      }
    }
    await this.fs.unlink(tempFile);
    if (useFallback) await this.createAreaGitignoreWithoutHardLink();
    await syncFolder(this.fs, this.paths.root);
  }

  /**
   * Fallback without hard links (FIND-037, TS-R-13): exclusive create with one write and fsync. Because this is
   * not atomic, an existing file that is empty or a proper prefix of the content is completed while area.json
   * is missing; any other existing file stays unchanged.
   */
  private async createAreaGitignoreWithoutHardLink(): Promise<void> {
    const target = this.paths.gitignore;
    try {
      await writeAndSync(this.fs, target, AREA_GITIGNORE_CONTENT, "wx");
      return;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
    const existing = await this.fs.readFile(target, "utf8");
    if (existing !== AREA_GITIGNORE_CONTENT && AREA_GITIGNORE_CONTENT.startsWith(existing)) {
      await writeFileAtomic(target, AREA_GITIGNORE_CONTENT, this.fs);
    }
  }

  private async ensureFolder(folder: string): Promise<void> {
    try {
      await this.fs.mkdir(folder);
    } catch (error) {
      if (errorCode(error) === "EEXIST") return;
      throw error;
    }
    await syncFolder(this.fs, path.dirname(folder));
  }

  private exists(file: string): Promise<boolean> {
    return this.fs.access(file).then(
      () => true,
      (error: unknown) => {
        if (errorCode(error) === "ENOENT") return false;
        throw error;
      },
    );
  }
}

/**
 * Start step 5 (TechSpec 2.1, 2.14 N-06): the first symbolic link among `.ramifold/`, `area.json`, `.gitignore`,
 * `plans/`, `local/`, `local/tmp/` and the entries directly in `local/`; null if there is none.
 */
async function findAreaSymlink(root: string): Promise<string | null> {
  for (const relPath of ["area.json", ".gitignore", "plans", "local/tmp"]) {
    const link = await findSymlink(root, relPath);
    if (link !== null) return link;
  }
  return findSymlinkInFolder(root, "local");
}

/** A whole-number `format` above the known one; checked before the schema, which a newer format may change. */
function isNewerFormat(data: unknown): boolean {
  if (typeof data !== "object" || data === null || !("format" in data)) return false;
  return Number.isInteger(data.format) && (data.format as number) > AREA_FORMAT;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}
