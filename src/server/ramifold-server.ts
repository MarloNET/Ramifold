import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { version as ramifoldVersion } from "../../package.json";
import { AreaInitializer } from "./area/area-initializer";
import { areaPaths } from "./area/area-paths";
import { AreaStore } from "./area/area-store";
import { parseStartArgs } from "./cli/parse-start-args";
import { TerminalOutput } from "./cli/terminal-output";
import { systemClock } from "./clock";
import { WindowHub } from "./events/window-hub";
import { createHttpApp } from "./http/create-http-app";
import { PlanService } from "./plan/plan-service";
import { InstanceGuard } from "./startup/instance-guard";

// Composition root (TechSpec 4.3, 4.4): only creates and wires services, then starts.

process.title = "ramifold-server";

const options = parseStartArgs(process.argv.slice(2), process.env, process.cwd());
const instanceId = randomUUID();
const webRoot = fileURLToPath(new URL("../web", import.meta.url));

const guard = new InstanceGuard({
  terminal: new TerminalOutput(),
  openHttp: (projectFolder) => {
    const windowHub = new WindowHub({ instanceId, simulated: options.simulated });
    const app = createHttpApp({
      instance: { instanceId, projectFolder, simulated: options.simulated, ramifoldVersion },
      windowHub,
      planService: new PlanService(new AreaStore(areaPaths(projectFolder))),
      webRoot,
    });
    return {
      listen: async (port) => {
        await app.listen({ host: "127.0.0.1", port });
        return (app.server.address() as AddressInfo).port;
      },
      close: () => app.close(),
    };
  },
  createAreaInitializer: (projectFolder) => new AreaInitializer(areaPaths(projectFolder), systemClock),
});

const result = await guard.start(options);
if (result.status === "aborted") process.exitCode = 1;
