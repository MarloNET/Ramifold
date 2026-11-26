import { useSyncExternalStore } from "react";

// Paths `/` and `/plans/:planId`, navigation with the History API (TechSpec 4.3, FLOW-001).

export type Route = { name: "projects" } | { name: "plan"; planId: string } | { name: "unknown" };

export function matchRoute(pathname: string): Route {
  if (pathname === "/") return { name: "projects" };
  const plan = /^\/plans\/([0-9A-HJKMNP-TV-Z]{26})$/.exec(pathname);
  if (plan) return { name: "plan", planId: plan[1]! };
  return { name: "unknown" };
}

export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname);
  return matchRoute(pathname);
}
