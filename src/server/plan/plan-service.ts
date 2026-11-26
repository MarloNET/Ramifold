import type { PlanListResponseDto } from "../../shared/api-schemas";
import type { AreaStore } from "../area/area-store";

/**
 * The only plan interface for all callers (TechSpec 2.15, ADR-004), one method per endpoint.
 * Walking skeleton: listing only, without readability check; PlanRegistry takes over the listing with task #74.
 */
export class PlanService {
  constructor(private readonly areaStore: AreaStore) {}

  /** GET /api/plans: by `createdAt` ascending, then `planId`; entries without `createdAt` last (TechSpec 2.3). */
  async listPlans(): Promise<PlanListResponseDto> {
    const summaries = await this.areaStore.readPlanSummaries();
    const plans = summaries
      .map((s) => ({ planId: s.planId, title: s.title, createdAt: s.createdAt, readable: true, unreadable: null }))
      .sort(
        (a, b) =>
          compareNullLast(a.createdAt, b.createdAt) || (a.planId < b.planId ? -1 : a.planId > b.planId ? 1 : 0),
      );
    return { plans };
  }
}

function compareNullLast(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}
