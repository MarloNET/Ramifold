import type { FastifyInstance } from "fastify";
import type { PlanService } from "../../plan/plan-service";

/** Plan endpoints (TechSpec 2.3): list and open. */
export function registerPlanRoutes(app: FastifyInstance, deps: { planService: PlanService }): void {
  app.get("/api/plans", () => deps.planService.listPlans());
  app.get<{ Params: { planId: string } }>("/api/plans/:planId", (request) =>
    deps.planService.openPlan(request.params.planId),
  );
}
