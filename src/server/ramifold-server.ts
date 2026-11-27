import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { version as ramifoldVersion } from "../../package.json";
import { resolveAgentCommand } from "./agent/agent-command";
import { AgentGateway } from "./agent/agent-gateway";
import { ClaudeCodeAdapter } from "./agent/claude-code/claude-code-adapter";
import { AreaInitializer } from "./area/area-initializer";
import { areaPaths } from "./area/area-paths";
import { AreaStore } from "./area/area-store";
import { ErrorLog } from "./area/error-log";
import { parseStartArgs } from "./cli/parse-start-args";
import { TerminalOutput } from "./cli/terminal-output";
import { systemClock } from "./clock";
import { WindowHub } from "./events/window-hub";
import { createHttpApp } from "./http/create-http-app";
import { PlanService } from "./plan/plan-service";
import { ErrorReporter } from "./observability/error-reporter";
import { PlanRegistry } from "./plan/plan-registry";
import { InstanceGuard } from "./startup/instance-guard";
import { InstanceLock } from "./startup/instance-lock";
import { RunningInstanceProbe } from "./startup/running-instance-probe";
import { ShutdownController } from "./startup/shutdown-controller";

// Composition root (TechSpec 4.3, 4.4): only creates and wires services, then starts.

process.title = "ramifold-server";

const fakeClaudeScript = fileURLToPath(new URL("../../tools/fake-claude/fake-claude.mjs", import.meta.url));
const agentCommand = resolveAgentCommand(process.env, fakeClaudeScript);
const options = { ...parseStartArgs(process.argv.slice(2), process.env, process.cwd()), simulated: agentCommand.simulated };
const instanceId = randomUUID();
const webRoot = fileURLToPath(new URL("../web", import.meta.url));
const terminal = new TerminalOutput();
const agentGateway = new AgentGateway(new ClaudeCodeAdapter({ command: agentCommand.command }), terminal);

const guard = new InstanceGuard({
  terminal,
  openHttp: (projectFolder) => {
    const windowHub = new WindowHub({ instanceId, simulated: options.simulated });
    const paths = areaPaths(projectFolder);
    const errorReporter = new ErrorReporter({ terminal, clock: systemClock, errorLog: new ErrorLog(paths) });
    const planRegistry = new PlanRegistry({ areaStore: new AreaStore(paths), errorReporter });
    const app = createHttpApp({
      instance: { instanceId, projectFolder, simulated: options.simulated, ramifoldVersion },
      windowHub,
      planService: new PlanService({ planRegistry }),
      webRoot,
    });
    return {
      listen: async (port) => {
        await app.listen({ host: "127.0.0.1", port });
        return (app.server.address() as AddressInfo).port;
      },
      close: async () => {
        const closed = app.close();
        // Open SSE streams would keep the server open; ending them closes the streams of all windows.
        app.server.closeAllConnections();
        await closed;
      },
    };
  },
  createAreaInitializer: (projectFolder) => new AreaInitializer(areaPaths(projectFolder), systemClock),
  createInstanceLock: (projectFolder) =>
    new InstanceLock({
      store: new AreaStore(areaPaths(projectFolder)),
      clock: systemClock,
      instanceId,
      projectFolder,
      pid: process.pid,
    }),
  probe: new RunningInstanceProbe(),
  onRunning: ({ http, lock }) =>
    new ShutdownController({
      // Hook for ending a running AI request with `instance_stopped`; the AI coordination follows with #105.
      stopAiRequest: async () => undefined,
      closeHttp: () => http.close(),
      releaseLock: () => lock.release(),
    }).install(),
});

const result = await guard.start(options);
if (result.status === "aborted") process.exitCode = 1;
else void agentGateway.checkAtStartup();
