import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checksums } from "../helpers/checksums";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// The one shared snapshot helper of the "folder unchanged" assertions (unit, integration, E2E).

const isRoot = process.getuid?.() === 0;

let project: TempProject;
let dir: string;
let outside: string;
beforeEach(async () => {
  project = await createTempProject();
  dir = path.join(project.dir, "watched");
  outside = path.join(project.dir, "outside.json");
  await fsp.mkdir(path.join(dir, "sub"), { recursive: true });
  await fsp.writeFile(path.join(dir, "sub", "a.json"), "{}");
  await fsp.writeFile(outside, "{}");
});
afterEach(() => project.cleanup());

describe("checksums", () => {
  it("records files, folders and links by relative path", async () => {
    await fsp.symlink(outside, path.join(dir, "link.json"));
    expect(Object.keys(await checksums(dir)).sort()).toEqual(["link.json", "sub", path.join("sub", "a.json")]);
    expect((await checksums(dir)).sub).toBe("folder");
  });

  it("detects a changed file, a new folder and a retargeted link", async () => {
    await fsp.symlink(outside, path.join(dir, "link.json"));
    const before = await checksums(dir);

    await fsp.writeFile(path.join(dir, "sub", "a.json"), "{ }");
    await fsp.mkdir(path.join(dir, "empty"));
    await fsp.rm(path.join(dir, "link.json"));
    await fsp.symlink(path.join(project.dir, "other.json"), path.join(dir, "link.json"));

    const after = await checksums(dir);
    expect(after[path.join("sub", "a.json")]).not.toBe(before[path.join("sub", "a.json")]);
    expect(after.empty).toBe("folder");
    expect(after["link.json"]).not.toBe(before["link.json"]);
  });

  it("never follows a link: a change of the link target outside is not part of the snapshot", async () => {
    await fsp.symlink(outside, path.join(dir, "link.json"));
    await fsp.symlink(project.dir, path.join(dir, "linked-folder"));
    const before = await checksums(dir);
    await fsp.writeFile(outside, '{"changed":true}');
    expect(await checksums(dir)).toEqual(before);
    expect(Object.keys(before)).not.toContain(path.join("linked-folder", "outside.json"));
  });

  it.skipIf(isRoot)("records an unreadable file by size and modification time instead of failing", async () => {
    const file = path.join(dir, "sub", "a.json");
    await fsp.chmod(file, 0o000);
    try {
      const { size, mtimeMs } = await fsp.stat(file);
      expect((await checksums(dir))[path.join("sub", "a.json")]).toBe(`unreadable ${size} ${mtimeMs}`);
    } finally {
      await fsp.chmod(file, 0o644);
    }
  });
});
