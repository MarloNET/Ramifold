import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanStamp } from "../../src/server/area/plan-stamp";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// TechSpec 2.12 "Datei-Stempel": relative path -> {size, mtimeMs, ctimeMs, ino} for all files under plans/<planId>/,
// without PLAN.md and without files with `.tmp-` in the name; same path set and same values per path.

let project: TempProject;
let planDir: string;
beforeEach(async () => {
  project = await createTempProject();
  planDir = path.join(project.dir, ".ramifold", "plans", "P");
  await fsp.mkdir(path.join(planDir, "nodes"), { recursive: true });
  await fsp.writeFile(path.join(planDir, "plan.json"), "{}\n");
  await fsp.writeFile(path.join(planDir, "nodes", "a.json"), "{}\n");
});
afterEach(() => project.cleanup());

describe("PlanStamp", () => {
  it("records all files recursively with their relative paths", async () => {
    const stamp = await PlanStamp.capture(planDir);
    expect(stamp.paths()).toEqual(["nodes/a.json", "plan.json"]);
    await expect(stamp.matchesDisk()).resolves.toBe(true);
  });

  it("detects a changed, an added and a removed file", async () => {
    let stamp = await PlanStamp.capture(planDir);
    await fsp.writeFile(path.join(planDir, "nodes", "a.json"), '{"changed":true}\n');
    await expect(stamp.matchesDisk()).resolves.toBe(false);

    stamp = await PlanStamp.capture(planDir);
    await fsp.mkdir(path.join(planDir, "chats"));
    await fsp.writeFile(path.join(planDir, "chats", "c.jsonl"), "{}\n");
    await expect(stamp.matchesDisk()).resolves.toBe(false);

    stamp = await PlanStamp.capture(planDir);
    await fsp.rm(path.join(planDir, "chats", "c.jsonl"));
    await expect(stamp.matchesDisk()).resolves.toBe(false);
  });

  it("ignores PLAN.md and temp files", async () => {
    const stamp = await PlanStamp.capture(planDir);
    await fsp.writeFile(path.join(planDir, "PLAN.md"), "# Export\n");
    await fsp.writeFile(path.join(planDir, "nodes", "a.json.tmp-0a1b2c3d"), "{}");
    await expect(stamp.matchesDisk()).resolves.toBe(true);
  });

  it("refresh takes over own writes and removes deleted paths", async () => {
    const stamp = await PlanStamp.capture(planDir);
    await fsp.writeFile(path.join(planDir, "nodes", "b.json"), "{}\n");
    await fsp.rm(path.join(planDir, "nodes", "a.json"));
    await stamp.refresh(["nodes/b.json", "nodes/a.json"]);
    expect(stamp.paths()).toEqual(["nodes/b.json", "plan.json"]);
    await expect(stamp.matchesDisk()).resolves.toBe(true);
  });

  it("does not descend into a linked folder", async () => {
    const outside = path.join(project.dir, "outside");
    await fsp.mkdir(outside);
    await fsp.writeFile(path.join(outside, "x.json"), "{}");
    await fsp.symlink(outside, path.join(planDir, "chats"));
    const stamp = await PlanStamp.capture(planDir);
    expect(stamp.paths()).toEqual(["chats", "nodes/a.json", "plan.json"]);
  });
});
