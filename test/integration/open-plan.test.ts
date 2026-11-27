import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { planListResponseSchema, planViewSchema } from "../../src/shared/api-schemas";
import { UNREADABLE_SEED, writeSeedArea, writeSeedPlan } from "../../tools/seed/seed-scenarios";
import { checksums } from "../helpers/checksums";
import { startTestApp, TEST_INSTANCE_ID, type TestApp } from "../helpers/http-app";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// GET /api/plans/:planId with the branches 200, 404 and 409 (TechSpec 2.3, v0.15, N-10) on a real project folder.

let t: TestApp | undefined;
let project: TempProject | undefined;
afterEach(async () => {
  await t?.close();
  await project?.cleanup();
  t = undefined;
  project = undefined;
});

const PLAN = "01JDQ7Z8M3A6Y2W4X5V7T9R2P1";
const ROOT = "01JDQ7Z8M3A6Y2W4X5V7T9R2N0";
const N1 = "01JDQ7Z8M3A6Y2W4X5V7T9R2N1";
const N2 = "01JDQ7Z8M3A6Y2W4X5V7T9R2N2";
const N21 = "01JDQ7Z8M3A6Y2W4X5V7T9R2N3";

async function open(app: TestApp, url: string) {
  const windowId = app.windowHub.open({ write: () => true, on: () => undefined });
  return app.app.inject({
    url,
    headers: { host: app.host, "x-ramifold-instance": TEST_INSTANCE_ID, "x-ramifold-window": windowId },
  });
}

describe("GET /api/plans/:planId", () => {
  it("200 with the tree of a readable plan: numbers, titles and result status (AC-REQ-007-01)", async () => {
    project = await createTempProject();
    await writeSeedArea(project.dir);
    await writeSeedPlan(project.dir, {
      planId: PLAN,
      createdAt: "2026-11-03T10:00:00.000Z",
      nodes: [
        { id: ROOT, parentId: null, title: "Eigenes produktives RAG", position: "a0" },
        { id: N2, parentId: ROOT, title: "Retrieval", position: "a1" },
        { id: N1, parentId: ROOT, title: "Datenquellen und Ingestion", position: "a0" },
        { id: N21, parentId: N2, title: "Chunking", position: "a0" },
      ],
      results: [
        { id: "01JDQ7Z8M3A6Y2W4X5V7T9R2V1", nodeId: N2, status: "concept", content: "Hybrid", createdAt: "2026-11-04T10:00:00.000Z" },
        { id: "01JDQ7Z8M3A6Y2W4X5V7T9R2V2", nodeId: N21, status: "fixed", content: "512", createdAt: "2026-11-04T11:00:00.000Z" },
      ],
    });
    t = await startTestApp({ projectFolder: project.dir });

    const res = await open(t, `/api/plans/${PLAN}`);

    expect(res.statusCode).toBe(200);
    const view = planViewSchema.parse(res.json());
    expect(view).toMatchObject({ planId: PLAN, title: "Eigenes produktives RAG", createdAt: "2026-11-03T10:00:00.000Z", readOnly: null });
    expect(view.nodes.map((n) => [n.number, n.title, n.resultStatus, n.depth, n.childCount, n.descendantCount])).toEqual([
      [null, "Eigenes produktives RAG", "open", 0, 2, 3],
      ["1", "Datenquellen und Ingestion", "open", 1, 0, 0],
      ["2", "Retrieval", "concept", 1, 1, 1],
      ["2.1", "Chunking", "fixed", 2, 0, 0],
    ]);
  });

  it("404 plan_not_found for an id that is no ULID and for an unknown plan", async () => {
    project = await createTempProject();
    await writeSeedArea(project.dir);
    t = await startTestApp({ projectFolder: project.dir });

    for (const planId of ["not-a-plan", "..%2F..%2Fetc", PLAN]) {
      const res = await open(t, `/api/plans/${planId}`);
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ error: { code: "plan_not_found", details: { planId: decodeURIComponent(planId) } } });
    }
    expect(t.errorLines).toEqual([]);
  });

  it("409 plan_unreadable with {title, cause, location} for an unreadable plan, files unchanged (AC-REQ-072-01)", async () => {
    project = await createTempProject({ scenario: "unreadable" });
    const { rag } = UNREADABLE_SEED;
    const planDir = path.join(project.dir, ".ramifold", "plans", rag.planId);
    const before = await checksums(planDir);
    t = await startTestApp({ projectFolder: project.dir });

    const res = await open(t, `/api/plans/${rag.planId}`);

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: {
        code: "plan_unreadable",
        details: {
          title: rag.title,
          cause: "git_conflict",
          location: `.ramifold/plans/${rag.planId}/nodes/${rag.conflictNodeId}.json`,
        },
      },
    });
    expect(await checksums(planDir)).toEqual(before);
  });

  it("loads a folder that is new since the last listing; unreadable -> 409, reported once (v0.15, N-10)", async () => {
    project = await createTempProject();
    await writeSeedArea(project.dir);
    t = await startTestApp({ projectFolder: project.dir });
    expect(planListResponseSchema.parse((await open(t, "/api/plans")).json()).plans).toEqual([]);

    // New after the listing and with a node whose parent does not exist.
    await writeSeedPlan(project.dir, {
      planId: PLAN,
      createdAt: "2026-11-03T10:00:00.000Z",
      nodes: [
        { id: ROOT, parentId: null, title: "Neu" },
        { id: N1, parentId: "01JDQ7Z8M3A6Y2W4X5V7T9R2ZZ", title: "Verwaist" },
      ],
    });
    const nodeFile = path.join(project.dir, ".ramifold", "plans", PLAN, "nodes", `${N1}.json`);
    const before = await fsp.readFile(nodeFile, "utf8");

    for (let i = 0; i < 2; i += 1) {
      const res = await open(t, `/api/plans/${PLAN}`);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({
        error: { code: "plan_unreadable", details: { title: "Neu", cause: "inconsistent", location: `.ramifold/plans/${PLAN}/nodes/${N1}.json` } },
      });
    }
    expect(t.errorLines.filter((line) => line.includes(PLAN))).toHaveLength(1);
    expect(await fsp.readFile(nodeFile, "utf8")).toBe(before);
  });
});
