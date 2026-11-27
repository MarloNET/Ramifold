import { execFile } from "node:child_process";
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
