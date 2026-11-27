import { useEffect, useMemo } from "react";
import { RouterProvider } from "react-aria-components";
import { instanceInfoSchema } from "../../shared/api-schemas";
import { ApiClient } from "../api/api-client";
import { connectEventStream } from "../api/event-stream-client";
import { AppHeader } from "../components/AppHeader";
import { ProjectListScreen } from "../screens/project-list/ProjectListScreen";
import { WorkspaceScreen } from "../screens/workspace/WorkspaceScreen";
import { usePlanViewState } from "../state/plan-view-store";
import { useWindowState, windowStore } from "../state/window-store";
import { navigate, useRoute } from "./router";

// Frame of the window: waits for `connected`, then loads data; router (TechSpec 4.3, 2.2).
// The server-down banner and the toast region follow with their tasks.

export function App() {
  const api = useMemo(() => new ApiClient(windowStore), []);
  const route = useRoute();
  const connected = useWindowState((s) => s.connection === "connected");
  const simulated = useWindowState((s) => s.connected?.simulated ?? false);
  const instance = useWindowState((s) => s.instance);
  const planTitle = usePlanViewState((s) => (route.name === "plan" && s.planId === route.planId ? (s.view?.title ?? null) : null));
  const folderName = instance?.projectFolder.name ?? null;

  useEffect(() => connectEventStream(windowStore), []);

  useEffect(() => {
    if (!connected) return;
    api.get("/api/instance", instanceInfoSchema).then(
      (info) => windowStore.setInstance(info),
      () => undefined,
    );
  }, [api, connected]);

  return (
    <RouterProvider navigate={navigate}>
      <AppHeader instance={instance} simulated={simulated} workspace={route.name === "plan" ? { planTitle } : undefined} />
      {route.name === "projects" && <ProjectListScreen api={api} connected={connected} folderName={folderName} />}
      {route.name === "plan" && (
        // One screen per plan: opening another plan starts with the initial state (plan column open).
        <WorkspaceScreen key={route.planId} api={api} connected={connected} planId={route.planId} folderName={folderName} />
      )}
    </RouterProvider>
  );
}
