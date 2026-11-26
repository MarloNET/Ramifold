import { randomBytes } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Clock } from "../clock";
import type { AreaPaths } from "./area-paths";
import { syncFolder, writeAndSync, writeFileAtomic, writeJsonFileAtomic } from "./atomic-write";

export type AreaFs = Pick<typeof fsp, "mkdir" | "open" | "link" | "rename" | "unlink" | "readFile" | "access">;

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

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}
