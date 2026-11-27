import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

/** SHA-256 of every file below the folder, links by their target path (never followed). */
export async function checksums(dir: string): Promise<Record<string, string>> {
  const sums: Record<string, string> = {};
  for (const entry of await fsp.readdir(dir, { withFileTypes: true, recursive: true })) {
    const file = path.join(entry.parentPath, entry.name);
    const content = entry.isSymbolicLink() ? await fsp.readlink(file) : entry.isFile() ? await fsp.readFile(file) : null;
    if (content !== null) sums[path.relative(dir, file)] = createHash("sha256").update(content).digest("hex");
  }
  return sums;
}
