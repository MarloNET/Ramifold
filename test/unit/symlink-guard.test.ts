import { constants } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaPaths, type AreaPaths } from "../../src/server/area/area-paths";
import { APPEND_NO_FOLLOW, assertNoSymlink, findSymlink, findSymlinkInFolder } from "../../src/server/area/symlink-guard";
import { checksums } from "../helpers/checksums";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// TechSpec 4.3 symlinkGuard, 2.14 "Keine symbolischen Links im Bereich" (v0.13, N-06).

let project: TempProject;
let area: string;
beforeEach(async () => {
  project = await createTempProject();
  area = path.join(project.dir, ".ramifold");
  await fsp.mkdir(path.join(area, "plans", "p1", "nodes"), { recursive: true });
});
afterEach(() => project.cleanup());

describe("findSymlink", () => {
  it("returns null when no part of the path is a link", async () => {
    await fsp.writeFile(path.join(area, "plans", "p1", "nodes", "n.json"), "{}");
    await expect(findSymlink(area, "plans/p1/nodes/n.json")).resolves.toBeNull();
  });

  it("finds a link as the last path part", async () => {
    const outside = path.join(project.dir, "outside.json");
    await fsp.writeFile(outside, "{}");
    await fsp.symlink(outside, path.join(area, "plans", "p1", "nodes", "n.json"));
    await expect(findSymlink(area, "plans/p1/nodes/n.json")).resolves.toBe(path.join(area, "plans", "p1", "nodes", "n.json"));
  });

  it("finds a link as a middle path part and does not follow it", async () => {
    const outside = path.join(project.dir, "outside");
    await fsp.mkdir(outside);
    await fsp.rm(path.join(area, "plans", "p1", "nodes"), { recursive: true });
    await fsp.symlink(outside, path.join(area, "plans", "p1", "nodes"));
    await expect(findSymlink(area, "plans/p1/nodes/n.json")).resolves.toBe(path.join(area, "plans", "p1", "nodes"));
  });

  it("checks the area folder itself", async () => {
    const real = path.join(project.dir, "real-area");
    await fsp.rename(area, real);
    await fsp.symlink(real, area);
    await expect(findSymlink(area, "plans")).resolves.toBe(area);
  });

  it("finds a dangling link", async () => {
    await fsp.symlink(path.join(project.dir, "missing"), path.join(area, "plans", "p1", "plan.json"));
    await expect(findSymlink(area, "plans/p1/plan.json")).resolves.toBe(path.join(area, "plans", "p1", "plan.json"));
  });

  it("a missing last part is no finding", async () => {
    await expect(findSymlink(area, "plans/p1/nodes/missing.json")).resolves.toBeNull();
    await expect(findSymlink(area, "plans/p2/plan.json")).resolves.toBeNull();
  });
});

describe("APPEND_NO_FOLLOW", () => {
  it("is append, write only, create and no-follow", () => {
    expect(APPEND_NO_FOLLOW).toBe(constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW);
  });

  it("appends to and creates a real file like 'a'", async () => {
    const file = path.join(area, "log");
    for (const line of ["one\n", "two\n"]) {
      const handle = await fsp.open(file, APPEND_NO_FOLLOW);
      await handle.writeFile(line);
      await handle.close();
    }
    expect(await fsp.readFile(file, "utf8")).toBe("one\ntwo\n");
  });

  it("refuses to open a link with ELOOP, the target stays byte-equal", async () => {
    const outside = path.join(project.dir, "outside.log");
    await fsp.writeFile(outside, "outside\n");
    await fsp.symlink(outside, path.join(area, "log"));
    await expect(fsp.open(path.join(area, "log"), APPEND_NO_FOLLOW)).rejects.toMatchObject({ code: "ELOOP" });
    expect(await fsp.readFile(outside, "utf8")).toBe("outside\n");
  });

  it("refuses a dangling link with ELOOP and creates no file at its target", async () => {
    await fsp.symlink(path.join(project.dir, "new.log"), path.join(area, "log"));
    await expect(fsp.open(path.join(area, "log"), APPEND_NO_FOLLOW)).rejects.toMatchObject({ code: "ELOOP" });
    await expect(fsp.access(path.join(project.dir, "new.log"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("symlinkGuard below local/ (start step 5 and writes in local/, DER-70-02, DER-70-04)", () => {
  let outside: TempProject;
  let paths: AreaPaths;
  beforeEach(async () => {
    outside = await createTempProject();
    paths = areaPaths(project.dir);
    await fsp.mkdir(paths.localTmp, { recursive: true });
    await fsp.writeFile(path.join(outside.dir, "target.txt"), "outside\n");
  });
  afterEach(() => outside.cleanup());

  /** Replaces the folder at `at` with a link to the folder outside. */
  async function replaceWithLink(at: string): Promise<void> {
    await fsp.rm(at, { recursive: true });
    await fsp.symlink(outside.dir, at);
  }

  describe("findSymlinkInFolder", () => {
    it("returns null for a folder without links and for a missing folder", async () => {
      await fsp.writeFile(paths.sessionsJson, "{}");
      await expect(findSymlinkInFolder(paths.root, "local")).resolves.toBeNull();
      await expect(findSymlinkInFolder(paths.root, "local/missing")).resolves.toBeNull();
    });

    it("finds a link on the way to the folder before its entries", async () => {
      await replaceWithLink(paths.local);
      await expect(findSymlinkInFolder(paths.root, "local")).resolves.toBe(paths.local);
    });

    it("finds the first link directly in the folder by name", async () => {
      await fsp.symlink(path.join(outside.dir, "target.txt"), paths.sessionsJson);
      await fsp.symlink(path.join(outside.dir, "target.txt"), paths.errorsLog);
      await expect(findSymlinkInFolder(paths.root, "local")).resolves.toBe(paths.errorsLog);
    });

    it("does not look deeper than the entries directly in the folder", async () => {
      await fsp.symlink(path.join(outside.dir, "target.txt"), path.join(paths.localTmp, "x.json"));
      await expect(findSymlinkInFolder(paths.root, "local")).resolves.toBeNull();
    });

    it("a file in place of the folder is no finding", async () => {
      await fsp.rm(paths.local, { recursive: true });
      await fsp.writeFile(paths.local, "");
      await expect(findSymlinkInFolder(paths.root, "local")).resolves.toBeNull();
    });
  });

  describe("assertNoSymlink", () => {
    it("resolves when no path part is a link", async () => {
      await expect(assertNoSymlink(paths.root, "local/tmp")).resolves.toBeUndefined();
    });

    it.each([
      ["the area", () => paths.root],
      ["local/", () => paths.local],
      ["local/tmp/", () => paths.localTmp],
    ])("rejects like a write error with errno ELOOP when %s is a link, the target stays byte-equal", async (_name, at) => {
      await replaceWithLink(at());
      const before = await checksums(outside.dir);
      await expect(assertNoSymlink(paths.root, "local/tmp")).rejects.toMatchObject({ code: "ELOOP", path: at() });
      expect(await checksums(outside.dir)).toEqual(before);
    });
  });
});
