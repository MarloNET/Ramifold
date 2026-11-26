import path from "node:path";
import { describe, expect, it } from "vitest";
import { areaPaths } from "../../src/server/area/area-paths";

describe("areaPaths", () => {
  it("places every area file below <project>/.ramifold", () => {
    const p = areaPaths("/work/project");
    expect(p.root).toBe(path.join("/work/project", ".ramifold"));
    expect(p.gitignore).toBe(path.join("/work/project", ".ramifold", ".gitignore"));
    expect(p.areaJson).toBe(path.join("/work/project", ".ramifold", "area.json"));
    expect(p.plans).toBe(path.join("/work/project", ".ramifold", "plans"));
    expect(p.local).toBe(path.join("/work/project", ".ramifold", "local"));
    expect(p.localGitignore).toBe(path.join("/work/project", ".ramifold", "local", ".gitignore"));
    expect(p.localTmp).toBe(path.join("/work/project", ".ramifold", "local", "tmp"));
    expect(p.errorsLog).toBe(path.join("/work/project", ".ramifold", "local", "errors.log"));
  });

  it("builds plan file paths from the plan id", () => {
    const p = areaPaths("/work/project");
    const planId = "01JDQ7Z8M3A6Y2W4X5V7T9R1PS";
    expect(p.planDir(planId)).toBe(path.join(p.plans, planId));
    expect(p.planJson(planId)).toBe(path.join(p.plans, planId, "plan.json"));
    expect(p.nodesDir(planId)).toBe(path.join(p.plans, planId, "nodes"));
  });
});
