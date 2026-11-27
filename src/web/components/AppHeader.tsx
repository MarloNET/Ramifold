import { Link } from "react-aria-components";
import type { InstanceInfoDto } from "../../shared/api-schemas";
import { messages } from "../text/messages";
import { Icon } from "./Icon";

// Header of both screens: brand, mark "Simulated AI", link "Data notice"; in UI-001 the project folder, in UI-003 the
// breadcrumbs "Projects" › plan title (TechSpec 2.16, AL-04). The mark "Read-only" follows with task #140, "Export"
// with #148, the dialog UI-009 behind "Data notice" with task T-09.

export function AppHeader(props: {
  instance: InstanceInfoDto | null;
  simulated: boolean;
  /** Set in UI-003: the title of the opened plan, null while it loads. */
  workspace?: { planTitle: string | null };
}) {
  const { instance, simulated, workspace } = props;
  return (
    <header className="app-header">
      <span className="app-header__brand">{messages["AppHeader.brand"]}</span>
      {workspace !== undefined && <Breadcrumbs planTitle={workspace.planTitle} />}
      {workspace === undefined && instance && (
        <ProjectFolder
          displayPath={instance.projectFolder.displayPath}
          absolutePath={instance.projectFolder.absolutePath}
        />
      )}
      <div className="app-header__actions">
        {simulated && (
          <span className="mark" title={messages["AppHeader.simulatedAiTooltip"]}>
            <Icon name="simulated-ai" />
            {messages["AppHeader.simulatedAi"]}
          </span>
        )}
        <Link className="app-header__link">{messages["AppHeader.dataNotice"]}</Link>
      </div>
    </header>
  );
}

/** "Projects" (link to UI-001), the decorative separator and the plan title, shortened with "…" (UI-003). */
function Breadcrumbs({ planTitle }: { planTitle: string | null }) {
  return (
    <nav className="breadcrumbs" aria-label={messages["AppHeader.breadcrumb"]}>
      <Link className="breadcrumbs__link" href="/">
        {messages["AppHeader.projects"]}
      </Link>
      {planTitle !== null && (
        <>
          <Icon name="breadcrumb-separator" />
          <span className="breadcrumbs__here">{planTitle}</span>
        </>
      )}
    </nav>
  );
}

/**
 * "Project folder: <path>", shortened in the middle with "…" when too long (UI-001 screen.md): the beginning is cut
 * off with an ellipsis, the last path segment (the folder name) stays visible. Full path as tooltip.
 */
function ProjectFolder({ displayPath, absolutePath }: { displayPath: string; absolutePath: string }) {
  const text = messages["AppHeader.projectFolder"](displayPath);
  // Path without "/" (the home folder "~"): the whole path is the tail.
  const split = Math.max(text.lastIndexOf("/"), text.length - displayPath.length);
  return (
    <span className="app-header__folder" title={absolutePath}>
      <span className="app-header__folder-head">{text.slice(0, split)}</span>
      <span className="app-header__folder-tail">{text.slice(split)}</span>
    </span>
  );
}
