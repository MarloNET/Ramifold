import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { areaPaths } from "../../src/server/area/area-paths";
import { AreaStore, inspectProjectFolder } from "../../src/server/area/area-store";
import { writePlanFiles } from "../helpers/plan-files";
import { createTempProject, type TempProject } from "../helpers/temp-project";

let project: TempProject;
beforeEach(async () => (project = await createTempProject()));
afterEach(async () => {
  await fsp.chmod(project.dir, 0o755).catch(() => undefined);
  await project.cleanup();
});

describe("inspectProjectFolder", () => {
  it("returns the canonical path of a writable folder", async () => {
    await fsp.symlink(project.dir, path.join(project.dir, "self"));
    await expect(inspectProjectFolder(path.join(project.dir, "self"))).resolves.toEqual({
      status: "ok",
      canonicalPath: project.dir,
    });
  });

  it("detects a missing path, a file and a read-only folder", async () => {
    await fsp.writeFile(path.join(project.dir, "file"), "");
    expect(await inspectProjectFolder(path.join(project.dir, "nope"))).toEqual({ status: "missing" });
    expect(await inspectProjectFolder(path.join(project.dir, "file"))).toEqual({ status: "not_a_folder" });
    if (process.getuid?.() !== 0) {
      await fsp.chmod(project.dir, 0o555);
      expect(await inspectProjectFolder(project.dir)).toEqual({ status: "not_writable" });
    }
  });
});

describe("AreaStore.readPlanSummaries", () => {
  it("returns no plans when plans/ does not exist", async () => {
    await expect(new AreaStore(areaPaths(project.dir)).readPlanSummaries()).resolves.toEqual([]);
  });

  it("reads plan.json and the title of the root node", async () => {
    await writePlanFiles(project.dir, {
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      rootNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PT",
      title: "Eigenes produktives RAG",
      createdAt: "2026-11-03T10:00:00.000Z",
    });
    await expect(new AreaStore(areaPaths(project.dir)).readPlanSummaries()).resolves.toEqual([
      { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS", createdAt: "2026-11-03T10:00:00.000Z", title: "Eigenes produktives RAG" },
    ]);
  });

  it("ignores plan folders without plan.json (aborted creation) and plain files", async () => {
    const plans = areaPaths(project.dir).plans;
    await fsp.mkdir(path.join(plans, "01JDQ7Z8M3A6Y2W4X5V7T9R1PS", "nodes"), { recursive: true });
    await fsp.writeFile(path.join(plans, "README"), "");
    await expect(new AreaStore(areaPaths(project.dir)).readPlanSummaries()).resolves.toEqual([]);
  });

  it("returns null for parts that cannot be read (readability check follows with task #74)", async () => {
    const planDir = path.join(areaPaths(project.dir).plans, "01JDQ7Z8M3A6Y2W4X5V7T9R1PS");
    await fsp.mkdir(path.join(planDir, "nodes"), { recursive: true });
    await fsp.writeFile(path.join(planDir, "plan.json"), "<<<<<<< HEAD\n");
    await expect(new AreaStore(areaPaths(project.dir)).readPlanSummaries()).resolves.toEqual([
      { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PS", createdAt: null, title: null },
    ]);
  });
});
