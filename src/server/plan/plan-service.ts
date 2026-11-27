import type { PlanListResponseDto, PlanViewDto } from "../../shared/api-schemas";
import type { PlanRegistry } from "./plan-registry";
import { buildTree } from "./tree-model";

/**
 * The only plan interface for all callers (TechSpec 2.15, ADR-004), one method per endpoint; delegates to the services
 * of `plan/` without own domain logic.
 */
export class PlanService {
  constructor(private readonly deps: { planRegistry: Pick<PlanRegistry, "list" | "getLoaded"> }) {}

  /** GET /api/plans with readability (TechSpec 2.3). */
  async listPlans(): Promise<PlanListResponseDto> {
    return { plans: await this.deps.planRegistry.list() };
  }

  /**
   * GET /api/plans/:planId (TechSpec 2.3, v0.15, N-10): the loaded plan with its tree in tree order; `getLoaded` throws
   * `PlanNotFoundError` (404) or `PlanUnreadableError` (409). The stamp check when opening (`readOnly`, TechSpec 2.12)
   * follows with task #139; until then `readOnly` is null.
   */
  async openPlan(planId: string): Promise<PlanViewDto> {
    const { plan } = await this.deps.planRegistry.getLoaded(planId);
    return { planId, title: plan.title, createdAt: plan.createdAt, readOnly: null, nodes: buildTree(plan) };
  }
}
