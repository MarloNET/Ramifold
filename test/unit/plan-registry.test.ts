import { describe, expect, it } from "vitest";
import type { AreaStore } from "../../src/server/area/area-store";
import type { PlanStamp } from "../../src/server/area/plan-stamp";
import type { LoadedPlan, PlanTreeCheck } from "../../src/server/area/plan-validator";
import type { ErrorReport } from "../../src/server/observability/error-reporter";
import { PlanNotFoundError, PlanUnreadableError } from "../../src/server/plan/plan-errors";
import { PlanRegistry } from "../../src/server/plan/plan-registry";

// TechSpec 2.3 "Laden": PlanRegistry loads a plan at the first listing, keeps it until the end, reports an unreadable
// plan exactly once per instance (DER-18-05), reads plans/ anew on every listing.

const A = "01JDQ7Z8M3A6Y2W4X5V7T9R1PA";
const B = "01JDQ7Z8M3A6Y2W4X5V7T9R1PB";
const C = "01JDQ7Z8M3A6Y2W4X5V7T9R1PC";
const D = "01JDQ7Z8M3A6Y2W4X5V7T9R1PD";

const readable = (planId: string, title: string, createdAt: string): PlanTreeCheck => ({
  readable: true,
  plan: { planId, title, createdAt, nodes: [], results: new Map(), chats: new Map() } as LoadedPlan,
});
const unreadable = (title: string | null, createdAt: string | null): PlanTreeCheck => ({
  readable: false,
  cause: "git_conflict",
  location: `.ramifold/plans/${C}/nodes/x.json`,
  title,
  createdAt,
});

function setup(disk: Record<string, PlanTreeCheck | null>) {
  const folders = { current: Object.keys(disk) };
  const loads: string[] = [];
  const areaStore = {
    listPlanFolders: async () => folders.current,
    loadPlan: async (planId: string) => {
      loads.push(planId);
      const check = disk[planId];
      return check == null ? null : { check, stamp: {} as PlanStamp };
    },
  } as Pick<AreaStore, "listPlanFolders" | "loadPlan"> as AreaStore;
  const reports: ErrorReport[] = [];
  const registry = new PlanRegistry({ areaStore, errorReporter: { report: async (r) => void reports.push(r) } });
  return { registry, folders, loads, reports, disk };
}

describe("PlanRegistry.list", () => {
  it("sorts by createdAt ascending, then planId; entries without createdAt last (TechSpec 2.3)", async () => {
    const { registry } = setup({
      [D]: unreadable(null, null),
      [C]: readable(C, "C", "2026-11-12T08:00:00.000Z"),
      [B]: readable(B, "B", "2026-11-12T08:00:00.000Z"),
      [A]: readable(A, "A", "2026-11-03T10:00:00.000Z"),
    });
    const plans = await registry.list();
    expect(plans.map((p) => p.planId)).toEqual([A, B, C, D]);
    expect(plans[0]).toEqual({ planId: A, title: "A", createdAt: "2026-11-03T10:00:00.000Z", readable: true, unreadable: null });
  });

  it("lists an unreadable plan with title and date as far as readable, cause and location", async () => {
    const { registry } = setup({ [C]: unreadable("Altes Experiment", "2026-11-20T08:00:00.000Z") });
    expect(await registry.list()).toEqual([
      {
        planId: C,
        title: "Altes Experiment",
        createdAt: "2026-11-20T08:00:00.000Z",
        readable: false,
        unreadable: { cause: "git_conflict", location: `.ramifold/plans/${C}/nodes/x.json` },
      },
    ]);
  });

  it("DER-18-05: reports an unreadable plan exactly once per instance, also with parallel listings", async () => {
    const { registry, reports } = setup({ [C]: unreadable(null, null), [A]: readable(A, "A", "2026-11-03T10:00:00.000Z") });
    await Promise.all([registry.list(), registry.list()]);
    await registry.list();
    expect(reports).toEqual([
      { kind: "plan_unreadable", cause: "git_conflict", planId: C, detail: `.ramifold/plans/${C}/nodes/x.json` },
    ]);
  });

  it("loads each plan once and keeps it; an unreadable plan stays unreadable until the end", async () => {
    const { registry, loads, disk } = setup({ [A]: readable(A, "A", "2026-11-03T10:00:00.000Z"), [C]: unreadable(null, null) });
    await registry.list();
    disk[C] = readable(C, "fixed", "2026-11-03T10:00:00.000Z");
    const plans = await registry.list();
    expect(loads).toEqual([A, C]);
    expect(plans.find((p) => p.planId === C)?.readable).toBe(false);
  });

  it("reads plans/ anew: new folders are loaded, folders without plan.json are ignored until they have one", async () => {
    const { registry, folders, disk } = setup({ [A]: readable(A, "A", "2026-11-03T10:00:00.000Z"), [B]: null });
    expect((await registry.list()).map((p) => p.planId)).toEqual([A]);
    disk[B] = readable(B, "B", "2026-11-04T10:00:00.000Z");
    folders.current = [A, B];
    expect((await registry.list()).map((p) => p.planId)).toEqual([A, B]);
  });

  it("a loaded plan whose folder disappeared stays listed", async () => {
    const { registry, folders } = setup({ [A]: readable(A, "A", "2026-11-03T10:00:00.000Z") });
    await registry.list();
    folders.current = [];
    expect((await registry.list()).map((p) => p.planId)).toEqual([A]);
  });
});

describe("PlanRegistry.getLoaded", () => {
  it("returns the runtime of a listed plan without loading again", async () => {
    const { registry, loads } = setup({ [A]: readable(A, "A", "2026-11-03T10:00:00.000Z") });
    await registry.list();
    expect(await registry.getLoaded(A)).toMatchObject({ state: "writable", plan: { title: "A" } });
    expect(loads).toEqual([A]);
  });

  it("throws PlanUnreadableError with title, cause and location for an unreadable plan (N-10)", async () => {
    const { registry } = setup({ [C]: unreadable("X", null) });
    await registry.list();
    const error = await registry.getLoaded(C).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PlanUnreadableError);
    expect(error).toMatchObject({
      code: "plan_unreadable",
      details: { title: "X", cause: "git_conflict", location: `.ramifold/plans/${C}/nodes/x.json` },
    });
  });

  it("loads a folder that is new since the last listing, with the same check and the same single report", async () => {
    const { registry, reports, folders, loads } = setup({ [C]: unreadable("X", null) });
    folders.current = [];
    await registry.list();
    await expect(registry.getLoaded(C)).rejects.toBeInstanceOf(PlanUnreadableError);
    folders.current = [C];
    await registry.list();
    await expect(registry.getLoaded(C)).rejects.toBeInstanceOf(PlanUnreadableError);
    expect(loads).toEqual([C]);
    expect(reports).toHaveLength(1);
  });

  it("throws PlanNotFoundError for an unknown plan, a folder without plan.json and an invalid id (without file access)", async () => {
    const { registry, loads } = setup({ [B]: null });
    await expect(registry.getLoaded(B)).rejects.toMatchObject({ code: "plan_not_found", details: { planId: B } });
    await expect(registry.getLoaded(D)).rejects.toBeInstanceOf(PlanNotFoundError);
    await expect(registry.getLoaded("../../etc")).rejects.toBeInstanceOf(PlanNotFoundError);
    expect(loads).toEqual([B, D]);
  });

  it("does not report a readable plan", async () => {
    const { registry, reports } = setup({ [A]: readable(A, "A", "2026-11-03T10:00:00.000Z") });
    await registry.getLoaded(A);
    expect(reports).toEqual([]);
  });
});
