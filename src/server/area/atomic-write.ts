import { randomBytes } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

export type AtomicWriteFs = Pick<typeof fsp, "open" | "rename" | "unlink">;

/**
 * Writes a file atomically (TechSpec 2.14, REQ-055): temp file `<name>.tmp-<8 hex>` in the target folder,
 * write, fsync, rename onto the target name, then fsync the folder. Counts as saved only after the folder fsync.
 */
export async function writeFileAtomic(target: string, content: string, fs: AtomicWriteFs = fsp): Promise<void> {
  const tempFile = `${target}.tmp-${randomBytes(4).toString("hex")}`;
  try {
    await writeAndSync(fs, tempFile, content, "wx");
    await fs.rename(tempFile, target);
  } catch (error) {
    await fs.unlink(tempFile).catch(() => undefined);
    throw error;
  }
  await syncFolder(fs, path.dirname(target));
}

/** Opens a file with the given flags, writes the content in one call and fsyncs it. */
export async function writeAndSync(fs: Pick<typeof fsp, "open">, file: string, content: string, flags: string) {
  const handle = await fs.open(file, flags);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function syncFolder(fs: Pick<typeof fsp, "open">, folder: string): Promise<void> {
  const handle = await fs.open(folder, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}
