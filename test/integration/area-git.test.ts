import fsp from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startRamifold } from "../helpers/ramifold-process";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// Example integration test with a real temp folder and real git; runs on Ubuntu and macOS in CI (TechSpec 6).

let project: TempProject;
const exists = (file: string) =>
  fsp.access(file).then(
    () => true,
    () => false,
  );
/** area.json and .ramifold/.gitignore byte for byte. */
const readVersioned = async (repo: string) =>
  Promise.all([fsp.readFile(`${repo}/.ramifold/area.json`), fsp.readFile(`${repo}/.ramifold/.gitignore`)]);
beforeEach(async () => (project = await createTempProject({ git: true })));
afterEach(() => project.cleanup());

describe("Ramifold area in a Git repository", () => {
  it("offers only the versioned area files to Git; local/ stays out", async () => {
    const running = await startRamifold({ folder: project.dir });
    await running.stop();
    const status = await project.git("status", "--porcelain", "--untracked-files=all");
    expect(status.split("\n").filter(Boolean).sort()).toEqual(["?? .ramifold/.gitignore", "?? .ramifold/area.json"]);
  });

  it("starts in a fresh clone: local parts are created, versioned files stay byte-equal", async () => {
    const first = await startRamifold({ folder: project.dir });
    await first.stop();
    await project.git("add", "-A");
    await project.git("commit", "--quiet", "-m", "area");
    const clone = await createTempProject();
    try {
      await clone.git("clone", "--quiet", project.dir, "repo");
      const repo = `${clone.dir}/repo`;
      const before = await clone.git("-C", repo, "ls-files", "-s");
      const versioned = await readVersioned(repo);
      expect(await exists(`${repo}/.ramifold/local`)).toBe(false);
      const second = await startRamifold({ folder: repo });
      // local/, local/.gitignore and local/tmp/ are new, the lock is held (TechSpec 2.1, FIND-029).
      expect(await fsp.readFile(`${repo}/.ramifold/local/.gitignore`, "utf8")).toBe("*\n");
      expect((await fsp.stat(`${repo}/.ramifold/local/tmp`)).isDirectory()).toBe(true);
      expect(JSON.parse(await fsp.readFile(`${repo}/.ramifold/local/instance.lock`, "utf8"))).toMatchObject({
        port: second.port,
        projectFolder: repo,
      });
      await second.stop();
      expect(await readVersioned(repo)).toEqual(versioned);
      expect(await clone.git("-C", repo, "ls-files", "-s")).toBe(before);
      expect(await clone.git("-C", repo, "status", "--porcelain", "--untracked-files=all")).toBe("");
    } finally {
      await clone.cleanup();
    }
  });
});
