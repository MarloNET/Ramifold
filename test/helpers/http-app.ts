import fsp from "node:fs/promises";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { areaPaths } from "../../src/server/area/area-paths";
import { AreaStore } from "../../src/server/area/area-store";
import { ErrorLog } from "../../src/server/area/error-log";
import { systemClock } from "../../src/server/clock";
import { WindowHub } from "../../src/server/events/window-hub";
import { createHttpApp } from "../../src/server/http/create-http-app";
import { ErrorReporter } from "../../src/server/observability/error-reporter";
import { PlanRegistry } from "../../src/server/plan/plan-registry";
import { PlanService } from "../../src/server/plan/plan-service";

export const TEST_INSTANCE_ID = "6f9619ff-8b86-4011-b42d-00c04fc964ff";

export type TestApp = {
  app: FastifyInstance;
  port: number;
  host: string;
  windowHub: WindowHub;
  projectFolder: string;
  /** `[ramifold]` error lines that would go to stderr. */
  errorLines: string[];
  close(): Promise<void>;
};

/** createHttpApp on 127.0.0.1 with a free port, a temp project folder and a minimal web build. */
export async function startTestApp(options: { projectFolder?: string; simulated?: boolean } = {}): Promise<TestApp> {
  const tmp = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "ramifold-http-")));
  const webRoot = path.join(tmp, "web");
  await fsp.mkdir(path.join(webRoot, "assets"), { recursive: true });
  await fsp.writeFile(path.join(webRoot, "index.html"), "<!doctype html><title>Ramifold</title>");
  await fsp.writeFile(path.join(webRoot, "assets", "app.js"), "console.log(1);");
  const projectFolder = options.projectFolder ?? path.join(tmp, "project");
  await fsp.mkdir(projectFolder, { recursive: true });

  const simulated = options.simulated ?? false;
  const windowHub = new WindowHub({ instanceId: TEST_INSTANCE_ID, simulated });
  const paths = areaPaths(projectFolder);
  const errorLines: string[] = [];
  const errorReporter = new ErrorReporter({
    terminal: { errorLine: (line) => errorLines.push(line) },
    clock: systemClock,
    errorLog: new ErrorLog(paths),
  });
  const app = createHttpApp({
    instance: { instanceId: TEST_INSTANCE_ID, projectFolder, simulated, ramifoldVersion: "0.0.0-dev" },
    windowHub,
    planService: new PlanService({ planRegistry: new PlanRegistry({ areaStore: new AreaStore(paths), errorReporter }) }),
    webRoot,
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const port = (app.server.address() as AddressInfo).port;
  return {
    app,
    port,
    host: `127.0.0.1:${port}`,
    windowHub,
    projectFolder,
    errorLines,
    close: async () => {
      await app.close();
      await fsp.rm(tmp, { recursive: true, force: true });
    },
  };
}
