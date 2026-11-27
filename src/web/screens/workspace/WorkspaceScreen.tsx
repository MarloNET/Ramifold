import { useEffect, useState } from "react";
import { Button } from "react-aria-components";
import { planUnreadableDetailsSchema, planViewSchema, type PlanUnreadableDetailsDto } from "../../../shared/api-schemas";
import { ApiError, type ApiClient } from "../../api/api-client";
import { shortenPlanTitle, usePageTitle } from "../../app/page-title";
import { navigate } from "../../app/router";
import { Icon } from "../../components/Icon";
import { planViewStore, usePlanViewState } from "../../state/plan-view-store";
import { messages } from "../../text/messages";
import { PlanTree } from "./PlanTree";

// UI-003 workspace, layout (TechSpec 2.3, 2.16, 4.3): plan column with the tree and the node area. Opening loads
// GET /api/plans/:planId: "Loading plan…" in the tree, node area empty; then the root is selected and all nodes are
// expanded. `409 plan_unreadable` leads to UI-011 over UI-001 (v0.15, N-10). Below 1024 px the plan column is an
// expandable area ("Show plan"/"Hide plan", initially open, window-local; only CSS and `data-plan-open`).
// The node area (node header, objective, result, chat) is filled with task #78.

/** Navigation state for UI-001 after `409 plan_unreadable` (TechSpec 2.3, v0.15, N-10). */
export type UnreadablePlanNavigationState = { unreadablePlan: PlanUnreadableDetailsDto & { planId: string } };

export function WorkspaceScreen(props: { api: ApiClient; connected: boolean; planId: string; folderName: string | null }) {
  const { api, connected, planId, folderName } = props;
  const [planColumnOpen, setPlanColumnOpen] = useState(true);
  const view = usePlanViewState((s) => (s.planId === planId ? s.view : null));
  const selectedNodeId = usePlanViewState((s) => s.selectedNodeId);
  const expandedIds = usePlanViewState((s) => s.expandedIds);

  usePageTitle(view === null || folderName === null ? null : messages["UI-003.pageTitle"](shortenPlanTitle(view.title), folderName));

  useEffect(() => {
    if (!connected) return;
    planViewStore.startLoading(planId);
    api.get(`/api/plans/${planId}`, planViewSchema).then(
      (loaded) => planViewStore.setLoaded(loaded),
      (error: unknown) => {
        if (!(error instanceof ApiError) || error.body === null) return;
        const { code, details } = error.body.error;
        if (code === "plan_unreadable") {
          const unreadable = planUnreadableDetailsSchema.safeParse(details);
          if (!unreadable.success) return;
          const state: UnreadablePlanNavigationState = { unreadablePlan: { planId, ...unreadable.data } };
          // Replace: going back must not repeat the failed open.
          navigate("/", { replace: true, state });
        } else if (code === "plan_not_found") {
          // Unknown plan: load the data anew (TechSpec 2.0).
          navigate("/", { replace: true });
        }
      },
    );
  }, [api, connected, planId]);

  return (
    <div className="workspace" data-plan-open={planColumnOpen}>
      <aside className="workspace__plan" aria-label={messages["UI-003.plan"]}>
        <Button
          className="button workspace__plan-toggle"
          aria-expanded={planColumnOpen}
          aria-controls="plan-column"
          onPress={() => setPlanColumnOpen((open) => !open)}
        >
          <Icon name={planColumnOpen ? "collapse" : "expand"} />
          {planColumnOpen ? messages["UI-003.hidePlan"] : messages["UI-003.showPlan"]}
        </Button>
        <div id="plan-column" className="workspace__tree">
          {view === null ? (
            <p className="loading-text">{messages["UI-003.loadingPlan"]}</p>
          ) : (
            <PlanTree
              nodes={view.nodes}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onSelect={(nodeId) => planViewStore.select(nodeId)}
              onExpandedChange={(ids) => planViewStore.setExpanded(ids)}
            />
          )}
        </div>
      </aside>
      {/* Node area: ObjectiveSection, node header, result and chat with the node detail of task #78 (MAR-1516). */}
      <main className="workspace__node" />
    </div>
  );
}
