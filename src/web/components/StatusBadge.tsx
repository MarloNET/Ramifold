import { messages } from "../text/messages";
import { Icon, type IconName } from "./Icon";

// Pills and marks (TechSpec 2.16 "Pillen und Marken"): the status pill of a result and the state marks at messages,
// each with symbol and text; symbol and colors depend only on the kind.

export type StatusBadgeKind = "open" | "concept" | "fixed" | "not_sent" | "incomplete" | "not_saved" | "aborted";

export const STATUS_BADGE_ICON: Record<StatusBadgeKind, IconName> = {
  open: "status-none",
  concept: "status-concept",
  fixed: "status-fixed",
  not_sent: "error",
  incomplete: "error",
  not_saved: "error",
  aborted: "aborted",
};

const TEXT: Record<StatusBadgeKind, string> = {
  open: messages["StatusBadge.open"],
  concept: messages["StatusBadge.concept"],
  fixed: messages["StatusBadge.fixed"],
  not_sent: messages["StatusBadge.notSent"],
  incomplete: messages["StatusBadge.incomplete"],
  not_saved: messages["StatusBadge.notSaved"],
  aborted: messages["StatusBadge.aborted"],
};

export function StatusBadge({ kind }: { kind: StatusBadgeKind }) {
  return (
    <span className="status-badge" data-kind={kind}>
      <Icon name={STATUS_BADGE_ICON[kind]} size="compact" />
      {TEXT[kind]}
    </span>
  );
}
