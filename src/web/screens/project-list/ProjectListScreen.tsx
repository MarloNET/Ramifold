import { useEffect, useRef, useState } from "react";
import { Button, Link } from "react-aria-components";
import { z } from "zod";
import { planListResponseSchema, planUnreadableDetailsSchema, type PlanListItemDto } from "../../../shared/api-schemas";
import type { ApiClient } from "../../api/api-client";
import { usePageTitle } from "../../app/page-title";
import { takeNavigationState } from "../../app/router";
import { Banner } from "../../components/Banner";
import { Icon } from "../../components/Icon";
import { messages } from "../../text/messages";
import { UnreadableProjectDialog, type UnreadableProjectInfo } from "./UnreadableProjectDialog";

// UI-001 project list: states loading, empty, default, error and permission/disabled (unreadable entry with
// "Details" -> UI-011, TechSpec 2.3). After `409 plan_unreadable` when opening, the workspace navigates here with the
// unreadable plan as navigation state: the list loads and UI-011 opens; "Close" puts the focus on "Details" of that
// row (v0.15, N-10). "New project" opens UI-002 with task #76.

/** Navigation state set by WorkspaceScreen (`UnreadablePlanNavigationState`). */
const unreadableNavigationSchema = z.object({
  unreadablePlan: planUnreadableDetailsSchema.extend({ planId: z.string() }),
});

const createdFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ProjectListScreen(props: { api: ApiClient; connected: boolean; folderName: string | null }) {
  const { api, connected, folderName } = props;
  const [plans, setPlans] = useState<PlanListItemDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unreadableDetails, setUnreadableDetails] = useState<UnreadableProjectInfo | null>(null);
  const [failedOpen] = useState(() => unreadableNavigationSchema.safeParse(takeNavigationState()).data?.unreadablePlan ?? null);
  const failedOpenShown = useRef(false);
  const detailsButtons = useRef(new Map<string, HTMLButtonElement>());

  usePageTitle(folderName === null ? null : messages["UI-001.pageTitle"](folderName));

  useEffect(() => {
    if (!connected) return;
    let current = true;
    api.get("/api/plans", planListResponseSchema).then(
      (response) => current && setPlans(response.plans),
      (error: unknown) => {
        // A network error switches the window to server-down (ApiClient); anything else is UI-001.error.
        if (current && !(error instanceof TypeError)) setLoadFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [api, connected]);

  useEffect(() => {
    if (plans === null || failedOpen === null || failedOpenShown.current) return;
    failedOpenShown.current = true;
    // Focus "Details" first: the dialog returns the focus there when it closes (UI-011, action "Close").
    detailsButtons.current.get(failedOpen.planId)?.focus();
    const { title, cause, location } = failedOpen;
    setUnreadableDetails({ title, cause, location });
  }, [plans, failedOpen]);

  const newProjectButton = (
    <Button className="button button--primary">
      <Icon name="new-project" />
      {messages["UI-001.newProject"]}
    </Button>
  );

  return (
    <main className="page">
      <div className="page__head">
        <h1>{messages["UI-001.heading"]}</h1>
        {plans !== null && plans.length > 0 && newProjectButton}
      </div>
      {loadFailed && <Banner variant="error">{messages["UI-001.error"]}</Banner>}
      {plans === null && !loadFailed && <p className="loading-text">{messages["UI-001.loading"]}</p>}
      {plans !== null && plans.length === 0 && (
        <div className="empty-state">
          <p>{messages["UI-001.empty"]}</p>
          {newProjectButton}
        </div>
      )}
      {plans !== null && plans.length > 0 && (
        <table className="project-table">
          <thead>
            <tr>
              <th scope="col">{messages["UI-001.columnTitle"]}</th>
              <th scope="col">{messages["UI-001.columnCreated"]}</th>
              <th scope="col">
                <span className="visually-hidden">{messages["UI-001.columnActions"]}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const title = plan.title ?? messages["UI-001.untitled"];
              const unreadable = plan.unreadable;
              return (
                <tr key={plan.planId} className={unreadable === null ? undefined : "project-table__row--unreadable"}>
                  <td>
                    {unreadable === null ? (
                      <Link className="project-table__title-link" href={`/plans/${plan.planId}`}>
                        {title}
                      </Link>
                    ) : (
                      <>
                        <span className="project-table__title-text">{title}</span>
                        <span className="mark mark--error">
                          <Icon name="warning" size="compact" />
                          {messages["UI-001.notReadable"]}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="project-table__created">
                    {plan.createdAt === null ? "" : createdFormat.format(new Date(plan.createdAt))}
                  </td>
                  <td className="project-table__actions">
                    {unreadable !== null && (
                      <Button
                        ref={(button) => {
                          if (button === null) detailsButtons.current.delete(plan.planId);
                          else detailsButtons.current.set(plan.planId, button);
                        }}
                        className="button"
                        onPress={() => setUnreadableDetails({ title: plan.title, ...unreadable })}
                      >
                        {messages["UI-001.details"]}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {unreadableDetails !== null && (
        <UnreadableProjectDialog {...unreadableDetails} onClose={() => setUnreadableDetails(null)} />
      )}
    </main>
  );
}
