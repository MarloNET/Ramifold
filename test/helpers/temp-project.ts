import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export type TempProject = {
  /** Canonical path of the project folder (realpath, also on macOS /var -> /private/var). */
  dir: string;
  git(...args: string[]): Promise<string>;
  cleanup(): Promise<void>;
};

/** Creates an empty project folder in the system temp folder, optionally as a Git repository. */
export async function createTempProject(options: { git?: boolean } = {}): Promise<TempProject> {
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
  return { dir, git, cleanup: () => fsp.rm(dir, { recursive: true, force: true }) };
}
