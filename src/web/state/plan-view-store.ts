import { useSyncExternalStore } from "react";
import type { PlanViewDto } from "../../shared/api-schemas";

// The opened plan of this window (TechSpec 4.3, 2.4): loaded tree, selected node and expansion state. Only in the
// memory of the window; nothing is saved (REQ-009). The node detail follows with task #78.

export type PlanViewState = {
  /** Plan being opened or open; null on the project list. */
  planId: string | null;
  /** null while "Loading plan…". */
  view: PlanViewDto | null;
  selectedNodeId: string | null;
  expandedIds: ReadonlySet<string>;
};

type Listener = () => void;

export type PlanViewStore = ReturnType<typeof createPlanViewStore>;

export function createPlanViewStore() {
  let state: PlanViewState = { planId: null, view: null, selectedNodeId: null, expandedIds: new Set() };
  const listeners = new Set<Listener>();
  const set = (next: Partial<PlanViewState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  return {
    getState: () => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Opening starts: the tree shows "Loading plan…", the node area is empty. */
    startLoading(planId: string) {
      set({ planId, view: null, selectedNodeId: null, expandedIds: new Set() });
    },
    /** After opening the root node is selected and all nodes are expanded (UI-001 "Vorhaben öffnen", DER-19-02). */
    setLoaded(view: PlanViewDto) {
      if (view.planId !== state.planId) return;
      const root = view.nodes.find((node) => node.parentId === null) ?? null;
      const expandedIds = new Set(view.nodes.filter((node) => node.childCount > 0).map((node) => node.id));
      set({ view, selectedNodeId: root?.id ?? null, expandedIds });
    },
    select(nodeId: string) {
      set({ selectedNodeId: nodeId });
    },
    setExpanded(expandedIds: ReadonlySet<string>) {
      set({ expandedIds });
    },
  };
}

export const planViewStore = createPlanViewStore();

export function usePlanViewState<T>(select: (state: PlanViewState) => T, store: PlanViewStore = planViewStore): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
