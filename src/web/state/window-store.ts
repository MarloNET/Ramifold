import { useSyncExternalStore } from "react";
import type { InstanceInfoDto } from "../../shared/api-schemas";
import type { ConnectedEvent } from "../../shared/sse-events";

// State of this window (TechSpec 2.2): connection, instance and the data of `connected`.
// AI request, live parts, read-only and consent follow with their features.

export type Connection = "connecting" | "connected" | "server_down";

export type WindowState = {
  connection: Connection;
  connected: ConnectedEvent | null;
  instance: InstanceInfoDto | null;
};

type Listener = () => void;

export type WindowStore = ReturnType<typeof createWindowStore>;

export function createWindowStore() {
  let state: WindowState = { connection: "connecting", connected: null, instance: null };
  const listeners = new Set<Listener>();
  const set = (next: Partial<WindowState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  return {
    getState: () => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setConnected(connected: ConnectedEvent) {
      if (state.connection === "server_down") return;
      set({ connection: "connected", connected });
    },
    setInstance(instance: InstanceInfoDto) {
      set({ instance });
    },
    /** Final for this window: no reconnect, no further requests (CC-11). */
    setServerDown() {
      set({ connection: "server_down" });
    },
  };
}

export const windowStore = createWindowStore();

export function useWindowState<T>(select: (state: WindowState) => T, store: WindowStore = windowStore): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
