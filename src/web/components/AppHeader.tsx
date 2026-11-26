import { Link } from "react-aria-components";
import type { InstanceInfoDto } from "../../shared/api-schemas";
import { messages } from "../text/messages";
import { Icon } from "./Icon";

// Header of both screens (UI-001, UI-003): brand, project folder, mark "Simulated AI", link "Data notice".
// Breadcrumbs and the mark "Read-only" follow with UI-003; the dialog UI-009 behind "Data notice" with task T-09.

export function AppHeader({ instance, simulated }: { instance: InstanceInfoDto | null; simulated: boolean }) {
  return (
    <header className="app-header">
      <span className="app-header__brand">{messages["AppHeader.brand"]}</span>
      {instance && (
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
