import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileAtomic } from "../../src/server/area/atomic-write";
import { faultFs, InjectedFault } from "../helpers/fault-fs";
import { createTempProject, type TempProject } from "../helpers/temp-project";

let project: TempProject;
beforeEach(async () => (project = await createTempProject()));
afterEach(() => project.cleanup());

describe("writeFileAtomic", () => {
  it("writes the content to the target file", async () => {
    const target = path.join(project.dir, "area.json");
    await writeFileAtomic(target, "{}\n");
    expect(await fsp.readFile(target, "utf8")).toBe("{}\n");
    expect(await fsp.readdir(project.dir)).toEqual(["area.json"]);
  });

  it("writes a temp file <name>.tmp-<8 hex>, syncs it, renames it and syncs the folder", async () => {
    const target = path.join(project.dir, "area.json");
    const { fs, calls } = faultFs();
    await writeFileAtomic(target, "{}\n", fs);
    const ops = calls.map((c) => c.op);
    expect(ops).toEqual(["open", "handle.writeFile", "handle.sync", "rename", "open", "handle.sync"]);
    expect(path.basename(calls[0]!.path!)).toMatch(/^area\.json\.tmp-[0-9a-f]{8}$/);
    expect(calls[3]!.path).toBe(target);
    expect(calls[4]!.path).toBe(project.dir);
  });

  it("never leaves a partly written target: a crash keeps the old content", async () => {
    const target = path.join(project.dir, "area.json");
    await fsp.writeFile(target, "old\n");
    for (const step of [1, 2, 3, 4]) {
      const { fs } = faultFs({ failAtStep: step });
      await expect(writeFileAtomic(target, "new content\n", fs)).rejects.toBeInstanceOf(InjectedFault);
      expect(await fsp.readFile(target, "utf8")).toBe("old\n");
    }
  });

  it("removes its temp file when writing fails", async () => {
    const target = path.join(project.dir, "area.json");
    const { fs } = faultFs({ failAtStep: 2 });
    await expect(writeFileAtomic(target, "new\n", fs)).rejects.toBeInstanceOf(InjectedFault);
    expect(await fsp.readdir(project.dir)).toEqual([]);
  });
});
