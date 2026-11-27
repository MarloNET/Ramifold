import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { SEED_SCENARIOS } from "../../tools/seed/seed-scenarios";

const run = promisify(execFile);

export type TempProject = {
  /** Canonical path of the project folder (realpath, also on macOS /var -> /private/var). */
  dir: string;
  git(...args: string[]): Promise<string>;
  cleanup(): Promise<void>;
};

/**
 * Creates a project folder in the system temp folder, optionally as a Git repository and filled with a seed
 * scenario (`tools/seed/seed-scenarios.ts`); without a scenario it is empty.
 */
export async function createTempProject(options: { git?: boolean; scenario?: keyof typeof SEED_SCENARIOS } = {}): Promise<TempProject> {
  const dir = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "ramifold-test-")));
  const git = async (...args: string[]) => {
    const { stdout } = await run("git", args, { cwd: dir });
    return stdout;
  };
  if (options.git) {
    await git("init", "--quiet", "--initial-branch=main");
    await git("config", "user.email", "test@example.invalid");
    await git("config", "user.name", "Ramifold Test");
    await git("config", "commit.gpgsign", "false");
  }
  if (options.scenario !== undefined) await SEED_SCENARIOS[options.scenario]!(dir);
  return { dir, git, cleanup: () => fsp.rm(dir, { recursive: true, force: true }) };
}

/** SHA-256 of every file and the list of all folders below `dir` (paths relative to `dir`). */
export async function checksums(dir: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of await fsp.readdir(dir, { recursive: true, withFileTypes: true })) {
    const full = path.join(entry.parentPath, entry.name);
    const key = path.relative(dir, full);
    if (entry.isDirectory()) result[key] = "folder";
    else {
      const content = await fsp.readFile(full).catch(() => null);
      const { size, mtimeMs } = await fsp.stat(full);
      // A file the test made unreadable is compared by size and modification time.
      result[key] = content ? createHash("sha256").update(content).digest("hex") : `unreadable ${size} ${mtimeMs}`;
    }
  }
  return result;
}
