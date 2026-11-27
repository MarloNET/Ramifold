import type { PlanListItemDto } from "../../shared/api-schemas";
import type { UnreadableCause } from "../../shared/codes";
import type { AreaStore } from "../area/area-store";
import type { PlanStamp } from "../area/plan-stamp";
import type { LoadedPlan } from "../area/plan-validator";
import type { ErrorReporter } from "../observability/error-reporter";
import { PlanNotFoundError, PlanUnreadableError } from "./plan-errors";

// Loaded plans and their runtime state (TechSpec 2.3 "Laden", 3.3 PlanRuntime, REQ-006, REQ-072, REQ-074). A plan is
// loaded completely at the first listing (or when it is first asked for), checked, and kept until Ramifold ends.
// An unreadable plan stays unreadable until the restart and is reported exactly once (terminal and error log).

const PLAN_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export type PlanRuntime =
  | { state: "writable" | "read_only"; planId: string; plan: LoadedPlan; stamp: PlanStamp }
  | {
      state: "unreadable";
      planId: string;
      title: string | null;
      createdAt: string | null;
      cause: UnreadableCause;
      location: string;
    };

export class PlanRegistry {
  private readonly plans = new Map<string, PlanRuntime>();
  /** Loads in progress, so that parallel listings load and report a plan only once. */
  private readonly loading = new Map<string, Promise<PlanRuntime | null>>();

  constructor(
    private readonly deps: {
      areaStore: Pick<AreaStore, "listPlanFolders" | "loadPlan">;
      errorReporter: Pick<ErrorReporter, "report">;
    },
  ) {}

  /**
   * GET /api/plans: reads `plans/` anew and loads new folders with `plan.json`; folders without it are ignored; a loaded
   * plan whose folder disappeared stays listed. Sorted by `createdAt` ascending, then `planId`; without `createdAt` last.
   */
  async list(): Promise<PlanListItemDto[]> {
    for (const planId of await this.deps.areaStore.listPlanFolders()) await this.ensureLoaded(planId);
    return [...this.plans.values()].map(toListItem).sort(compareListItems);
  }

  /**
   * The only access to a plan (TechSpec 2.3, v0.15, N-10): the loaded plan with its state `writable` or `read_only`;
   * a folder that is new since the last listing is loaded with the same operation as when listing. Throws
   * `PlanUnreadableError` for an unreadable plan and `PlanNotFoundError` for an unknown or invalid id.
   */
  async getLoaded(planId: string): Promise<Extract<PlanRuntime, { state: "writable" | "read_only" }>> {
    if (!PLAN_ID.test(planId)) throw new PlanNotFoundError(planId);
    const runtime = await this.ensureLoaded(planId);
    if (runtime === null) throw new PlanNotFoundError(planId);
    if (runtime.state === "unreadable") {
      throw new PlanUnreadableError({ title: runtime.title, cause: runtime.cause, location: runtime.location });
    }
    return runtime;
  }

  /** The runtime of a plan, loaded at most once; null if there is no plan folder with `plan.json`. */
  private async ensureLoaded(planId: string): Promise<PlanRuntime | null> {
    const loaded = this.plans.get(planId);
    if (loaded !== undefined) return loaded;
    let pending = this.loading.get(planId);
    if (pending === undefined) {
      pending = this.load(planId).finally(() => this.loading.delete(planId));
      this.loading.set(planId, pending);
    }
    return pending;
  }

  private async load(planId: string): Promise<PlanRuntime | null> {
    const loaded = await this.deps.areaStore.loadPlan(planId);
    if (loaded === null) return null;
    const { check, stamp } = loaded;
    const runtime: PlanRuntime = check.readable
      ? { state: "writable", planId, plan: check.plan, stamp }
      : {
          state: "unreadable",
          planId,
          title: check.title,
          createdAt: check.createdAt,
          cause: check.cause,
          location: check.location,
        };
    this.plans.set(planId, runtime);
    if (runtime.state === "unreadable") {
      await this.deps.errorReporter.report({
        kind: "plan_unreadable",
        cause: runtime.cause,
        planId,
        detail: runtime.location,
      });
    }
    return runtime;
  }
}

function toListItem(runtime: PlanRuntime): PlanListItemDto {
  if (runtime.state === "unreadable") {
    return {
      planId: runtime.planId,
      title: runtime.title,
      createdAt: runtime.createdAt,
      readable: false,
      unreadable: { cause: runtime.cause, location: runtime.location },
    };
  }
  return { planId: runtime.planId, title: runtime.plan.title, createdAt: runtime.plan.createdAt, readable: true, unreadable: null };
}

function compareListItems(a: PlanListItemDto, b: PlanListItemDto): number {
  if (a.createdAt !== b.createdAt) {
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  return a.planId < b.planId ? -1 : a.planId > b.planId ? 1 : 0;
}
