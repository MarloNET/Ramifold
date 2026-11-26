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
        <span className="app-header__folder" title={instance.projectFolder.absolutePath}>
          {messages["AppHeader.projectFolder"](instance.projectFolder.displayPath)}
        </span>
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
