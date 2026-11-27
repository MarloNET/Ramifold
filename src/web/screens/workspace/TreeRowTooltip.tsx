import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createPortal } from "react-dom";
import { treeRowTooltipText } from "./tree-row-text";

// The one tooltip of a tree row (TechSpec 2.16 "Tooltip der Baumzeile", DL-02, WCAG 1.4.13). React Aria offers
// tooltips only for buttons and links, hence this small unit. Visible while the pointer is on the row (after
// TOOLTIP_DELAY_MS) or the row has keyboard focus (at once); `Esc` hides it until focus and pointer left the row;
// it stays while the pointer is on row or tooltip and goes 150 ms after both were left; scrolling hides it, and so
// does resizing the window (position and shortening were measured when it appeared).
// Exactly one tooltip in the document: the one claimed last is shown.

/** Delay of tooltips on hover (also for IconButton, TechSpec 2.16). */
export const TOOLTIP_DELAY_MS = 600;
const HIDE_DELAY_MS = 150;

const claims: string[] = [];
const claimListeners = new Set<() => void>();
const claimsChanged = () => claimListeners.forEach((listener) => listener());
const subscribeClaims = (listener: () => void) => {
  claimListeners.add(listener);
  return () => claimListeners.delete(listener);
};

export function TreeRowTooltip(props: {
  isHovered: boolean;
  isFocusVisible: boolean;
  /** Title element of the row, measured when the tooltip is about to appear (`scrollWidth > clientWidth`). */
  titleRef: RefObject<HTMLElement | null>;
  title: string;
  statusWord: string;
}) {
  const { isHovered, isFocusVisible, titleRef, title, statusWord } = props;
  const owner = useId();
  const [hoverShown, setHoverShown] = useState(false);
  const [overTooltip, setOverTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [content, setContent] = useState<{ text: string; top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const wanted = (isFocusVisible || hoverShown || overTooltip) && !dismissed;
  const visible = useSyncExternalStore(subscribeClaims, () => claims.at(-1) === owner) && content !== null;

  // Hover: show after the delay, hide shortly after leaving (unless the pointer moved onto the tooltip).
  useEffect(() => {
    const timer = window.setTimeout(() => setHoverShown(isHovered), isHovered ? TOOLTIP_DELAY_MS : HIDE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isHovered]);

  // `Esc` dismisses until focus and pointer have left row and tooltip.
  useEffect(() => {
    if (!isFocusVisible && !isHovered && !overTooltip) setDismissed(false);
  }, [isFocusVisible, isHovered, overTooltip]);

  useEffect(() => {
    if (!wanted) return;
    const row = titleRef.current?.closest<HTMLElement>('[role="row"]');
    const titleElement = titleRef.current;
    if (!row || !titleElement) return;
    const isTruncated = titleElement.scrollWidth > titleElement.clientWidth;
    const rect = row.getBoundingClientRect();
    setContent({ text: treeRowTooltipText(title, statusWord, isTruncated), top: rect.bottom, left: rect.left });
    claims.push(owner);
    claimsChanged();

    const hide = () => setDismissed(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && claims.at(-1) === owner) hide();
    };
    // Capture phase: the tree handles `Esc` itself (keeps the selection, disallowEmptySelection).
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", hide, true);
      claims.splice(claims.indexOf(owner), 1);
      claimsChanged();
      setContent(null);
    };
  }, [wanted, owner, title, statusWord, titleRef]);

  // Keep the tooltip inside the window.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!visible || !tooltip || content === null) return;
    const maxLeft = window.innerWidth - tooltip.offsetWidth - 4;
    if (content.left > maxLeft) setContent({ ...content, left: Math.max(4, maxLeft) });
  }, [visible, content]);

  if (!visible || content === null) return null;
  return createPortal(
    <div
      ref={tooltipRef}
      className="tree-tooltip"
      role="tooltip"
      // The words are already in the accessible name of the row; the tooltip is only for seeing.
      aria-hidden="true"
      style={{ top: content.top, left: content.left }}
      onPointerEnter={() => setOverTooltip(true)}
      onPointerLeave={() => setOverTooltip(false)}
    >
      {content.text}
    </div>,
    document.body,
  );
}
