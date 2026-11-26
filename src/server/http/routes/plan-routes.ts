import type { FastifyInstance } from "fastify";
import type { PlanService } from "../../plan/plan-service";

/** Plan endpoints (TechSpec 2.3). Walking skeleton: GET /api/plans. */
export function registerPlanRoutes(app: FastifyInstance, deps: { planService: PlanService }): void {
  app.get("/api/plans", () => deps.planService.listPlans());
}
