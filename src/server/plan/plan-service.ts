import type { PlanListResponseDto } from "../../shared/api-schemas";
import type { PlanRegistry } from "./plan-registry";

/**
 * The only plan interface for all callers (TechSpec 2.15, ADR-004), one method per endpoint; delegates to the services
 * of `plan/` without own domain logic.
 */
export class PlanService {
  constructor(private readonly deps: { planRegistry: Pick<PlanRegistry, "list"> }) {}

  /** GET /api/plans with readability (TechSpec 2.3). */
  async listPlans(): Promise<PlanListResponseDto> {
    return { plans: await this.deps.planRegistry.list() };
  }
}
