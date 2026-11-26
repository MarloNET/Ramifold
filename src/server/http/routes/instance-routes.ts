import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { InstanceInfoDto } from "../../../shared/api-schemas";

export type InstanceDeps = {
  instanceId: string;
  projectFolder: string;
  simulated: boolean;
  ramifoldVersion: string;
};

/** GET /api/instance (TechSpec 2.2); also used by the lock check of a second start. */
export function registerInstanceRoutes(app: FastifyInstance, deps: { instance: InstanceDeps }): void {
  const { instance } = deps;
  const info: InstanceInfoDto = {
    instanceId: instance.instanceId,
    projectFolder: {
      absolutePath: instance.projectFolder,
      displayPath: displayPath(instance.projectFolder, os.homedir()),
      name: path.basename(instance.projectFolder),
    },
    simulated: instance.simulated,
    ramifoldVersion: instance.ramifoldVersion,
  };
  app.get("/api/instance", async () => info);
}

/** Replaces the home folder by `~`. */
function displayPath(absolutePath: string, home: string): string {
  if (absolutePath === home) return "~";
  return absolutePath.startsWith(home + path.sep) ? `~${absolutePath.slice(home.length)}` : absolutePath;
}
