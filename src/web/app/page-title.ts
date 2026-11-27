import { useEffect } from "react";

const MAX_PLAN_TITLE_CODE_POINTS = 40;

/** Sets the page title (CC-13, A-UX-16); null keeps the current one. */
export function usePageTitle(title: string | null): void {
  useEffect(() => {
    if (title !== null) document.title = title;
  }, [title]);
}

/** Plan title in the page title of UI-003: over 40 code points shortened to 39 and "…" (TechSpec 2.2). */
export function shortenPlanTitle(title: string): string {
  const codePoints = [...title];
  return codePoints.length > MAX_PLAN_TITLE_CODE_POINTS ? `${codePoints.slice(0, MAX_PLAN_TITLE_CODE_POINTS - 1).join("")}…` : title;
}
