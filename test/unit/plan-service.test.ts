import { describe, expect, it } from "vitest";
import type { PlanStamp } from "../../src/server/area/plan-stamp";
import type { LoadedPlan } from "../../src/server/area/plan-validator";
import { PlanUnreadableError } from "../../src/server/plan/plan-errors";
import { PlanService } from "../../src/server/plan/plan-service";
import { buildTree } from "../../src/server/plan/tree-model";
import { planViewSchema, type PlanListItemDto } from "../../src/shared/api-schemas";

describe("PlanService.listPlans", () => {
  it("returns the listing of PlanRegistry (TechSpec 2.3)", async () => {
    const plans: PlanListItemDto[] = [
      { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P0", title: "C", createdAt: "2026-11-03T10:00:00.000Z", readable: true, unreadable: null },
      {
        planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P1",
        title: null,
        createdAt: null,
        readable: false,
        unreadable: { cause: "damaged", location: ".ramifold/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1P1/plan.json" },
      },
    ];
    const service = new PlanService({ planRegistry: { list: async () => plans, getLoaded: async () => expect.unreachable() } });
    await expect(service.listPlans()).resolves.toEqual({ plans });
  });
});

describe("PlanService.openPlan", () => {
  const planId = "01JDQ7Z8M3A6Y2W4X5V7T9R1P0";
  const rootId = "01JDQ7Z8M3A6Y2W4X5V7T9R1N0";
  const childId = "01JDQ7Z8M3A6Y2W4X5V7T9R1N1";
  const at = "2026-11-03T10:00:00.000Z";
  const node = (id: string, parentId: string | null, title: string) => ({
    id,
    parentId,
    position: "a0",
    title,
    objective: "",
    createdAt: at,
    updatedAt: at,
  });

  it("returns the loaded plan as PlanViewDto with the tree from TreeModel (TechSpec 2.3)", async () => {
    const plan = {
      planId,
      title: "Eigenes produktives RAG",
      createdAt: at,
      nodes: [node(childId, rootId, "Datenquellen"), node(rootId, null, "Eigenes produktives RAG")],
      results: new Map(),
      chats: new Map(),
    } as LoadedPlan;
    const getLoaded = async (id: string) => {
      expect(id).toBe(planId);
      return { state: "writable" as const, planId, plan, stamp: {} as PlanStamp };
    };
    const service = new PlanService({ planRegistry: { list: async () => [], getLoaded } });

    const view = await service.openPlan(planId);

    expect(planViewSchema.parse(view)).toEqual({
      planId,
      title: "Eigenes produktives RAG",
      createdAt: at,
      readOnly: null,
      nodes: buildTree(plan),
    });
    expect(view.nodes.map((n) => [n.number, n.title])).toEqual([
      [null, "Eigenes produktives RAG"],
      ["1", "Datenquellen"],
    ]);
  });

  it("passes on the errors of getLoaded (404 plan_not_found, 409 plan_unreadable)", async () => {
    const error = new PlanUnreadableError({ title: "X", cause: "git_conflict", location: "l" });
    const service = new PlanService({
      planRegistry: { list: async () => [], getLoaded: async () => Promise.reject(error) },
    });
    await expect(service.openPlan(planId)).rejects.toBe(error);
  });
});
