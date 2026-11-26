import { useEffect, useState } from "react";
import { Button, Link } from "react-aria-components";
import { planListResponseSchema, type PlanListItemDto } from "../../../shared/api-schemas";
import type { ApiClient } from "../../api/api-client";
import { usePageTitle } from "../../app/page-title";
import { Icon } from "../../components/Icon";
import { messages } from "../../text/messages";

// UI-001 project list: states loading, empty and default (TechSpec 2.3). "New project" opens UI-002 with task #76;
// unreadable entries (permission/disabled) and the error state follow with their tasks.

const createdFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ProjectListScreen(props: { api: ApiClient; connected: boolean; folderName: string | null }) {
  const { api, connected, folderName } = props;
  const [plans, setPlans] = useState<PlanListItemDto[] | null>(null);

  usePageTitle(folderName === null ? null : messages["UI-001.pageTitle"](folderName));

  useEffect(() => {
    if (!connected) return;
    let current = true;
    api.get("/api/plans", planListResponseSchema).then(
      (response) => current && setPlans(response.plans),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [api, connected]);

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
      {plans === null && <p className="loading-text">{messages["UI-001.loading"]}</p>}
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
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.planId}>
                <td>
                  <Link className="project-table__title-link" href={`/plans/${plan.planId}`}>
                    {plan.title ?? messages["UI-001.untitled"]}
                  </Link>
                </td>
                <td className="project-table__created">
                  {plan.createdAt === null ? "" : createdFormat.format(new Date(plan.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
