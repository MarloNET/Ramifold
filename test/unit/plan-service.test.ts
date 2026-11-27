import { describe, expect, it } from "vitest";
import type { PlanListItemDto } from "../../src/shared/api-schemas";
import { PlanService } from "../../src/server/plan/plan-service";

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
    const service = new PlanService({ planRegistry: { list: async () => plans } });
    await expect(service.listPlans()).resolves.toEqual({ plans });
  });
});
