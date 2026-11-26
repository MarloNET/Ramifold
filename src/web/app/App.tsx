import { useEffect, useMemo } from "react";
import { RouterProvider } from "react-aria-components";
import { instanceInfoSchema } from "../../shared/api-schemas";
import { ApiClient } from "../api/api-client";
import { connectEventStream } from "../api/event-stream-client";
import { AppHeader } from "../components/AppHeader";
import { ProjectListScreen } from "../screens/project-list/ProjectListScreen";
import { useWindowState, windowStore } from "../state/window-store";
import { navigate, useRoute } from "./router";

// Frame of the window: waits for `connected`, then loads data; router (TechSpec 4.3, 2.2).
// The server-down banner and the toast region follow with their tasks; the workspace UI-003 with task #76.

export function App() {
  const api = useMemo(() => new ApiClient(windowStore), []);
  const route = useRoute();
  const connected = useWindowState((s) => s.connection === "connected");
  const simulated = useWindowState((s) => s.connected?.simulated ?? false);
  const instance = useWindowState((s) => s.instance);

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
      <AppHeader instance={instance} simulated={simulated} />
      {route.name === "projects" && (
        <ProjectListScreen api={api} connected={connected} folderName={instance?.projectFolder.name ?? null} />
      )}
    </RouterProvider>
  );
}
