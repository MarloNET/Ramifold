import { constants } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { APPEND_NO_FOLLOW, findSymlink } from "../../src/server/area/symlink-guard";
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

  it("a missing last part is no finding", async () => {
    await expect(findSymlink(area, "plans/p1/nodes/missing.json")).resolves.toBeNull();
    await expect(findSymlink(area, "plans/p2/plan.json")).resolves.toBeNull();
  });
});

describe("APPEND_NO_FOLLOW", () => {
  it("is append, write only, create and no-follow", () => {
    expect(APPEND_NO_FOLLOW).toBe(constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW);
  });
});
