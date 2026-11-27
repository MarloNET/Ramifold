import { Button } from "react-aria-components";
import type { UnreadableCause } from "../../../shared/codes";
import { ModalDialog } from "../../components/ModalDialog";
import { messages } from "../../text/messages";

// UI-011 project unreadable (docs/ux/screens/UI-011-project-unreadable/screen.md, TechSpec 2.3): error dialog with
// cause and location, no repair and no "Try again". Opened via "Details" in UI-001; the open path follows with #75.

export type UnreadableProjectInfo = { title: string | null; cause: UnreadableCause; location: string };

const CAUSE_TEXT = {
  git_conflict: messages["UI-011.causeGitConflict"],
  damaged: messages["UI-011.causeDamaged"],
  newer_version: messages["UI-011.causeNewerVersion"],
  inconsistent: messages["UI-011.causeInconsistent"],
} as const satisfies Record<UnreadableCause, string>;

export function UnreadableProjectDialog(props: UnreadableProjectInfo & { onClose: () => void }) {
  const { title, cause, location, onClose } = props;
  return (
    <ModalDialog
      title={title === null ? messages["UI-011.titleUntitled"] : messages["UI-011.title"](title)}
      headIcon={{ icon: "error", tone: "error" }}
      onClose={onClose}
      footer={
        // Initial focus on "Close" (UI-011 screen.md).
        <Button className="button button--primary" autoFocus onPress={onClose}>
          {messages["UI-011.close"]}
        </Button>
      }
    >
      <p>{messages["UI-011.text"]}</p>
      <dl className="facts">
        <dt>{messages["UI-011.cause"]}</dt>
        <dd>{CAUSE_TEXT[cause]}</dd>
        <dt>{messages["UI-011.location"]}</dt>
        <dd>
          <code>{location}</code>
        </dd>
      </dl>
      <p>{messages["UI-011.instruction"]}</p>
    </ModalDialog>
  );
}
