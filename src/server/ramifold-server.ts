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
import { parseStartArgs } from "./cli/parse-start-args";
import { TerminalOutput } from "./cli/terminal-output";
import { systemClock } from "./clock";
import { WindowHub } from "./events/window-hub";
import { createHttpApp } from "./http/create-http-app";
import { PlanService } from "./plan/plan-service";
import { InstanceGuard } from "./startup/instance-guard";

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
else void agentGateway.checkAtStartup();
