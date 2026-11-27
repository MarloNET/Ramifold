import { constants } from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// The only place for symbolic links in the area (TechSpec 4.3, 2.14 "Keine symbolischen Links im Bereich",
// v0.13, N-06): Ramifold follows no link inside `.ramifold/`, neither when reading nor when writing.

/** `open` flags for appending without following a link: like `"a"` plus `O_NOFOLLOW` (TechSpec 2.14). */
export const APPEND_NO_FOLLOW = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW;

/**
 * Checks with `lstat` every path part from `areaRoot` (`.ramifold/`, itself included) to `relPath` and returns the
 * absolute path of the first symbolic link, or null. A missing part is no finding; the parts below it do not exist.
 */
export async function findSymlink(areaRoot: string, relPath: string): Promise<string | null> {
  const parts = relPath.split(/[\\/]/).filter((part) => part !== "" && part !== ".");
  let current = areaRoot;
  for (let i = 0; i <= parts.length; i++) {
    if (i > 0) current = path.join(current, parts[i - 1]!);
    let stats;
    try {
      stats = await fsp.lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    if (stats.isSymbolicLink()) return current;
  }
  return null;
}

/**
 * Like `findSymlink` for the folder `relFolder`, then every entry directly in it (by name); a missing folder or a
 * file in its place is no finding (start step 5, TechSpec 2.1).
 */
export async function findSymlinkInFolder(areaRoot: string, relFolder: string): Promise<string | null> {
  const link = await findSymlink(areaRoot, relFolder);
  if (link !== null) return link;
  const folder = path.join(areaRoot, relFolder);
  let entries;
  try {
    entries = await fsp.readdir(folder, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw error;
  }
  const [first] = entries.filter((entry) => entry.isSymbolicLink()).map((entry) => entry.name).sort();
  return first === undefined ? null : path.join(folder, first);
}

/**
 * Before writing below `relPath`: every path part from `areaRoot` on must be a real folder or file. A link rejects
 * like a write error with `errno` `ELOOP` (cause `file_system_error`, TechSpec 2.14).
 */
export async function assertNoSymlink(areaRoot: string, relPath: string): Promise<void> {
  const link = await findSymlink(areaRoot, relPath);
  if (link === null) return;
  const error: NodeJS.ErrnoException = new Error(`ELOOP: symbolic link in the Ramifold area, '${link}'`);
  error.code = "ELOOP";
  error.errno = -os.constants.errno.ELOOP;
  error.syscall = "lstat";
  error.path = link;
  throw error;
}
