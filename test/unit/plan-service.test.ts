import { describe, expect, it } from "vitest";
import type { AreaStore } from "../../src/server/area/area-store";
import { PlanService } from "../../src/server/plan/plan-service";

const store = (summaries: Awaited<ReturnType<AreaStore["readPlanSummaries"]>>) =>
  ({ readPlanSummaries: async () => summaries }) as Pick<AreaStore, "readPlanSummaries"> as AreaStore;

describe("PlanService.listPlans", () => {
  it("lists plans by creation date ascending, then plan id, entries without date last (TechSpec 2.3)", async () => {
    const service = new PlanService(
      store([
        { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P3", createdAt: null, title: null },
        { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P2", createdAt: "2026-11-12T08:00:00.000Z", title: "B" },
        { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P1", createdAt: "2026-11-12T08:00:00.000Z", title: "A" },
        { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P0", createdAt: "2026-11-03T10:00:00.000Z", title: "C" },
      ]),
    );
    const { plans } = await service.listPlans();
    expect(plans.map((p) => p.planId)).toEqual([
      "01JDQ7Z8M3A6Y2W4X5V7T9R1P0",
      "01JDQ7Z8M3A6Y2W4X5V7T9R1P1",
      "01JDQ7Z8M3A6Y2W4X5V7T9R1P2",
      "01JDQ7Z8M3A6Y2W4X5V7T9R1P3",
    ]);
    expect(plans[0]).toEqual({
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P0",
      title: "C",
      createdAt: "2026-11-03T10:00:00.000Z",
      readable: true,
      unreadable: null,
    });
  });

  it("returns an empty list for an empty folder", async () => {
    await expect(new PlanService(store([])).listPlans()).resolves.toEqual({ plans: [] });
  });
});
