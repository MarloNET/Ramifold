import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { areaPaths } from "../../src/server/area/area-paths";
import { AreaStore } from "../../src/server/area/area-store";
import { ErrorLog } from "../../src/server/area/error-log";
import { TerminalOutput } from "../../src/server/cli/terminal-output";
import { systemClock } from "../../src/server/clock";
import { toHttpError } from "../../src/server/http/http-error-mapper";
import { ErrorReporter } from "../../src/server/observability/error-reporter";
import { PlanUnreadableError } from "../../src/server/plan/plan-errors";
import { PlanRegistry } from "../../src/server/plan/plan-registry";
import { planListResponseSchema } from "../../src/shared/api-schemas";
import { connectedEventSchema } from "../../src/shared/sse-events";
import { resolvedRagConflictNode, UNREADABLE_SEED } from "../../tools/seed/seed-scenarios";
import { checksums } from "../helpers/checksums";
import { startRamifold, type RunningRamifold } from "../helpers/ramifold-process";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// TechSpec 2.3 "Laden" and "Lesbarkeitsprüfung" (rule 0, v0.13, N-06), v0.15 N-10 (`getLoaded`, `toHttpError`):
// PlanRegistry on a real file system (AC-REQ-072-01, -03, -04) and the built Ramifold as a process (DER-18-08).

let project: TempProject | undefined;
let running: RunningRamifold | undefined;
afterEach(async () => {
  await running?.stop();
  await project?.cleanup();
  running = undefined;
  project = undefined;
});

/** PlanRegistry wired like in `ramifoldServer`, on the real project folder; one registry = one instance. */
function realRegistry(projectFolder: string) {
  const paths = areaPaths(projectFolder);
  let stderr = "";
  const terminal = new TerminalOutput({ stdout: { write: () => true }, stderr: { write: (s: string) => ((stderr += s), true) } });
  const errorReporter = new ErrorReporter({ terminal, clock: systemClock, errorLog: new ErrorLog(paths) });
  return { registry: new PlanRegistry({ areaStore: new AreaStore(paths), errorReporter }), stderr: () => stderr };
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => expect.unreachable("expected an error"),
    (error: unknown) => error,
  );
}

describe("PlanRegistry.getLoaded on a real file system (scenario unreadable)", () => {
  const { rag, inconsistent } = UNREADABLE_SEED;
  const ragPlans = () => path.join(project!.dir, ".ramifold", "plans", rag.planId);

  it("AC-REQ-072-01: Git conflict -> PlanUnreadableError, toHttpError 409 plan_unreadable, files unchanged", async () => {
    project = await createTempProject({ scenario: "unreadable" });
    const before = await checksums(ragPlans());
    const { registry } = realRegistry(project.dir);

    const error = await caught(registry.getLoaded(rag.planId));

    expect(error).toBeInstanceOf(PlanUnreadableError);
    expect(toHttpError(error)).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "plan_unreadable",
          details: {
            title: rag.title,
            cause: "git_conflict",
            location: `.ramifold/plans/${rag.planId}/nodes/${rag.conflictNodeId}.json`,
          },
        },
      },
    });
    expect(await checksums(ragPlans())).toEqual(before);
  });

  it("AC-REQ-072-04: parent without identity -> 409 plan_unreadable with cause inconsistent", async () => {
    project = await createTempProject({ scenario: "unreadable" });
    const { registry } = realRegistry(project.dir);

    expect(toHttpError(await caught(registry.getLoaded(inconsistent.planId)))).toEqual({
      statusCode: 409,
      body: {
        error: {
          code: "plan_unreadable",
          details: {
            title: inconsistent.title,
            cause: "inconsistent",
            location: `.ramifold/plans/${inconsistent.planId}/nodes/${inconsistent.orphanNodeId}.json`,
          },
        },
      },
    });
  });

  it("AC-REQ-072-03: after resolving the conflict and a restart, getLoaded returns tree, objectives, results and chats", async () => {
    project = await createTempProject({ scenario: "unreadable" });
    await caught(realRegistry(project.dir).registry.getLoaded(rag.planId));

    // Ramifold ended; the planner resolves the conflict; a new instance loads anew.
    await fsp.writeFile(path.join(ragPlans(), "nodes", `${rag.conflictNodeId}.json`), resolvedRagConflictNode());
    const { registry } = realRegistry(project.dir);
    const runtime = await registry.getLoaded(rag.planId);

    expect(runtime.state).toBe("writable");
    const { plan } = runtime;
    expect(plan.title).toBe(rag.title);
    expect(plan.nodes.map((n) => [n.id, n.parentId, n.title, n.objective])).toEqual(
      expect.arrayContaining([
        [rag.rootId, null, rag.title, "Produktives RAG für interne Dokumente planen"],
        [rag.conflictNodeId, rag.rootId, "Datenquellen und Ingestion", "Quellen festlegen"],
        [rag.resultNodeId, rag.rootId, "Retrieval", ""],
      ]),
    );
    expect(plan.nodes).toHaveLength(3);
    expect(plan.results.get(rag.resultNodeId)?.map((r) => [r.status, r.content])).toEqual([["concept", "Hybride Suche"]]);
    expect(plan.chats.get(rag.resultNodeId)?.events).toEqual([
      expect.objectContaining({ t: "planner_message", text: "Welche Suche passt?" }),
    ]);
  });
});

/** Opens a window via GET /api/events (kept open) and returns the request headers of that window. */
function openWindow(instance: RunningRamifold): Promise<{ headers: Record<string, string>; close: () => void }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: instance.port, path: "/api/events" }, (res) => {
      let buffer = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        buffer += chunk;
        const end = buffer.indexOf("\n\n");
        if (end === -1 || buffer.startsWith("event: connected") === false) return;
        const dataLine = buffer.slice(0, end).split("\n")[1]!;
        const connected = connectedEventSchema.parse(JSON.parse(dataLine.slice(6)));
        buffer = buffer.slice(end + 2);
        resolve({
          headers: { "x-ramifold-instance": connected.instanceId, "x-ramifold-window": connected.windowId },
          close: () => req.destroy(),
        });
      });
    });
    req.on("error", reject);
  });
}

describe("DER-18-08: symbolic link in a plan, Ramifold as a process", () => {
  const { monitoring } = UNREADABLE_SEED;

  for (const linked of ["node file", "chats/"] as const) {
    it(`a linked ${linked}: GET /api/plans reports damaged with the link as location, the target stays unchanged`, async () => {
      project = await createTempProject({ scenario: "unreadable" });
      const planDir = path.join(project.dir, ".ramifold", "plans", monitoring.planId);
      const outside = path.join(project.dir, "outside");
      await fsp.mkdir(outside);
      let link: string;
      if (linked === "node file") {
        link = path.join(planDir, "nodes", `${monitoring.rootId}.json`);
        await fsp.rename(link, path.join(outside, "root.json"));
        await fsp.symlink(path.join(outside, "root.json"), link);
      } else {
        link = path.join(planDir, "chats");
        await fsp.rename(link, path.join(outside, "chats"));
        await fsp.symlink(path.join(outside, "chats"), link);
      }
      const targetBefore = await checksums(outside);

      running = await startRamifold({ folder: project.dir });
      const window = await openWindow(running);
      const response = await fetch(`${running.url}/api/plans`, { headers: window.headers });
      window.close();

      expect(response.status).toBe(200);
      const entry = planListResponseSchema.parse(await response.json()).plans.find((p) => p.planId === monitoring.planId);
      const location = path.relative(project.dir, link).split(path.sep).join("/");
      expect(entry).toMatchObject({ readable: false, unreadable: { cause: "damaged", location } });
      expect(await checksums(outside)).toEqual(targetBefore);
      const errorsLog = await fsp.readFile(areaPaths(project.dir).errorsLog, "utf8");
      expect(errorsLog.split("\n").filter((line) => line.includes(`plan_unreadable`) && line.includes(monitoring.planId))).toHaveLength(1);
    });
  }
});
