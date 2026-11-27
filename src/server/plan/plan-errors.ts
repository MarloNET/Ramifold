import type { UnreadableCause } from "../../shared/codes";
import { DomainError } from "../domain-error";

// Error classes of `plan/` (TechSpec 4.2, 4.3, v0.15, N-10); further classes of this folder go into this file.

/** `404 plan_not_found`: no plan folder with `plan.json` for this id, or no valid id. */
export class PlanNotFoundError extends DomainError {
  constructor(planId: string) {
    super("plan_not_found", { planId });
  }
}

/** `409 plan_unreadable` with title (as far as readable), cause and location from loading (TechSpec 2.3, UI-011). */
export class PlanUnreadableError extends DomainError {
  constructor(details: { title: string | null; cause: UnreadableCause; location: string }) {
    super("plan_unreadable", details);
  }
}
