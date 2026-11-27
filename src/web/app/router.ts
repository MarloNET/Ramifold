import { useSyncExternalStore } from "react";

// Paths `/` and `/plans/:planId`, navigation with the History API (TechSpec 4.3, FLOW-001).

export type Route = { name: "projects" } | { name: "plan"; planId: string } | { name: "unknown" };

export function matchRoute(pathname: string): Route {
  if (pathname === "/") return { name: "projects" };
  const plan = /^\/plans\/([0-9A-HJKMNP-TV-Z]{26})$/.exec(pathname);
  if (plan) return { name: "plan", planId: plan[1]! };
  return { name: "unknown" };
}

/**
 * Navigates to `path`. `state` is the navigation state of the new entry (for example the unreadable plan after a
 * failed open, TechSpec 2.3, v0.15, N-10); `replace` replaces the current entry instead of adding one.
 */
export function navigate(path: string, options: { replace?: boolean; state?: unknown } = {}): void {
  if (options.replace) window.history.replaceState(options.state ?? null, "", path);
  else window.history.pushState(options.state ?? null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Returns the navigation state of the current entry once and removes it, so that a reload does not repeat it. */
export function takeNavigationState(): unknown {
  const state: unknown = window.history.state;
  if (state !== null) window.history.replaceState(null, "", window.location.href);
  return state;
}

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname);
  return matchRoute(pathname);
}
