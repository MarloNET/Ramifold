import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

/**
 * Snapshot of everything below the folder (paths relative to `dir`): SHA-256 of every file, links by their
 * target path (never followed), every folder as "folder". A file the test made unreadable is recorded by size
 * and modification time. Other entry types (sockets, FIFOs) are ignored.
 */
export async function checksums(dir: string): Promise<Record<string, string>> {
  const sums: Record<string, string> = {};
  for (const entry of await fsp.readdir(dir, { withFileTypes: true, recursive: true })) {
    const file = path.join(entry.parentPath, entry.name);
    const key = path.relative(dir, file);
    if (entry.isSymbolicLink()) sums[key] = hash(await fsp.readlink(file));
    else if (entry.isDirectory()) sums[key] = "folder";
    else if (entry.isFile()) {
      const content = await fsp.readFile(file).catch(() => null);
      if (content) sums[key] = hash(content);
      else {
        const { size, mtimeMs } = await fsp.stat(file);
        sums[key] = `unreadable ${size} ${mtimeMs}`;
      }
    }
  }
  return sums;
}

function hash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
