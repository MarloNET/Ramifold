import { useEffect } from "react";

/** Sets the page title (CC-13, A-UX-16); null keeps the current one. */
export function usePageTitle(title: string | null): void {
  useEffect(() => {
    if (title !== null) document.title = title;
  }, [title]);
}
