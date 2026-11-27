import type { TreeNodeDto } from "../../../shared/api-schemas";
import { messages } from "../../text/messages";

// Texts of a tree row (TechSpec 2.16 "Baumzeile", "Tooltip der Baumzeile"; Design v0.4.2, X2 (3), DL-02).

export const STATUS_WORD = {
  open: messages["StatusBadge.open"],
  concept: messages["StatusBadge.concept"],
  fixed: messages["StatusBadge.fixed"],
} as const satisfies Record<TreeNodeDto["resultStatus"], string>;

export type TreeRowTextInput = Pick<TreeNodeDto, "number" | "title" | "resultStatus"> & {
  /** Mark "Draft" visible at the row. */
  draft?: boolean;
  /** Hidden descendants of a collapsed node ("+n"); 0 or missing: not shown. */
  hiddenCount?: number;
  /** Mark "AI running" visible at the row. */
  aiRunning?: boolean;
};

/**
 * Accessible name of the row in the fixed order "<number> <title>, <status word>[, Draft][, +<n>][, AI running]"; the
 * root has no number. The title is always complete, also when the row shows it shortened.
 */
export function treeRowName(row: TreeRowTextInput): string {
  const parts = [row.number === null ? row.title : `${row.number} ${row.title}`, STATUS_WORD[row.resultStatus]];
  if (row.draft) parts.push(messages["UI-003.draft"]);
  if (row.hiddenCount) parts.push(`+${row.hiddenCount}`);
  if (row.aiRunning) parts.push(messages["UI-003.aiRunning"]);
  return parts.join(", ");
}

/** The one tooltip of a row: "<full title> · <status word>" when the title is shortened, else the status word. */
export function treeRowTooltipText(title: string, statusWord: string, isTruncated: boolean): string {
  return isTruncated ? `${title} · ${statusWord}` : statusWord;
}
