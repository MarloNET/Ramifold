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

describe("AreaStore.listPlanFolders", () => {
  it("returns no plans when plans/ does not exist", async () => {
    await expect(new AreaStore(areaPaths(project.dir)).listPlanFolders()).resolves.toEqual([]);
  });

  it("lists folders and links with a plan id as name, sorted; files and other names are no plans", async () => {
    const plans = areaPaths(project.dir).plans;
    await fsp.mkdir(path.join(plans, "01JDQ7Z8M3A6Y2W4X5V7T9R1PT"), { recursive: true });
    await fsp.mkdir(path.join(plans, "01JDQ7Z8M3A6Y2W4X5V7T9R1PS"));
    await fsp.mkdir(path.join(plans, "notes"));
    await fsp.writeFile(path.join(plans, "README"), "");
    await fsp.symlink(path.join(project.dir, "elsewhere"), path.join(plans, "01JDQ7Z8M3A6Y2W4X5V7T9R1PV"));
    await expect(new AreaStore(areaPaths(project.dir)).listPlanFolders()).resolves.toEqual([
      "01JDQ7Z8M3A6Y2W4X5V7T9R1PS",
      "01JDQ7Z8M3A6Y2W4X5V7T9R1PT",
      "01JDQ7Z8M3A6Y2W4X5V7T9R1PV",
    ]);
  });
});

describe("AreaStore.loadPlan", () => {
  const planId = "01JDQ7Z8M3A6Y2W4X5V7T9R1PS";

  it("loads a readable plan together with its file stamp", async () => {
    await writePlanFiles(project.dir, {
      planId,
      rootNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1PT",
      title: "Eigenes produktives RAG",
      createdAt: "2026-11-03T10:00:00.000Z",
    });
    const loaded = await new AreaStore(areaPaths(project.dir)).loadPlan(planId);
    expect(loaded?.check).toMatchObject({ readable: true, plan: { title: "Eigenes produktives RAG" } });
    expect(loaded?.stamp.paths()).toEqual(["nodes/01JDQ7Z8M3A6Y2W4X5V7T9R1PT.json", "plan.json"]);
  });

  it("returns null for a plan folder without plan.json (aborted creation)", async () => {
    await fsp.mkdir(path.join(areaPaths(project.dir).plans, planId, "nodes"), { recursive: true });
    await expect(new AreaStore(areaPaths(project.dir)).loadPlan(planId)).resolves.toBeNull();
  });

  it("does not follow a linked plan folder, also not for the stamp", async () => {
    const outside = path.join(project.dir, "outside");
    await fsp.mkdir(outside);
    await fsp.writeFile(path.join(outside, "plan.json"), "{}");
    await fsp.mkdir(areaPaths(project.dir).plans, { recursive: true });
    await fsp.symlink(outside, path.join(areaPaths(project.dir).plans, planId));
    const loaded = await new AreaStore(areaPaths(project.dir)).loadPlan(planId);
    expect(loaded?.check).toMatchObject({ readable: false, cause: "damaged", location: `.ramifold/plans/${planId}` });
    expect(loaded?.stamp.paths()).toEqual([]);
  });
});
