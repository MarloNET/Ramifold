import fsp from "node:fs/promises";
import path from "node:path";
import { AREA_FORMAT, AREA_GITIGNORE_CONTENT } from "../../src/server/area/area-initializer";

// Test data scenarios for `npm run seed` (TechSpec 4.3, 6). Each scenario fills an empty project folder with
// synthetic data. Scenarios `default` and `two-hundred` follow with their tasks.

export type SeedScenario = (projectFolder: string) => Promise<void>;

export type SeedNode = { id: string; parentId: string | null; title: string; objective?: string; position?: string };
export type SeedResult = { id: string; nodeId: string; status: "concept" | "fixed"; content: string; createdAt: string };
export type SeedChat = { id: string; nodeId: string; createdAt: string; events: Record<string, unknown>[] };
export type SeedPlan = {
  planId: string;
  createdAt: string;
  nodes: SeedNode[];
  results?: SeedResult[];
  chats?: SeedChat[];
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Writes `.ramifold/area.json` and `.ramifold/.gitignore` like the first start does (TechSpec 2.14). */
export async function writeSeedArea(projectFolder: string): Promise<void> {
  const area = path.join(projectFolder, ".ramifold");
  await fsp.mkdir(path.join(area, "plans"), { recursive: true });
  await fsp.writeFile(path.join(area, ".gitignore"), AREA_GITIGNORE_CONTENT);
  await fsp.writeFile(path.join(area, "area.json"), json({ format: AREA_FORMAT, createdAt: "2026-11-01T08:00:00.000Z" }));
}

/** Writes a plan in format 1 (TechSpec 3.1): node files, result versions, chat files, then plan.json. */
export async function writeSeedPlan(projectFolder: string, plan: SeedPlan): Promise<void> {
  const planDir = path.join(projectFolder, ".ramifold", "plans", plan.planId);
  await fsp.mkdir(path.join(planDir, "nodes"), { recursive: true });
  for (const [index, node] of plan.nodes.entries()) {
    const file = {
      id: node.id,
      parentId: node.parentId,
      position: node.position ?? `a${index}`,
      title: node.title,
      objective: node.objective ?? "",
      createdAt: plan.createdAt,
      updatedAt: plan.createdAt,
    };
    await fsp.writeFile(path.join(planDir, "nodes", `${node.id}.json`), json(file));
  }
  for (const result of plan.results ?? []) {
    await fsp.mkdir(path.join(planDir, "results", result.nodeId), { recursive: true });
    await fsp.writeFile(path.join(planDir, "results", result.nodeId, `${result.id}.json`), json(result));
  }
  for (const chat of plan.chats ?? []) {
    await fsp.mkdir(path.join(planDir, "chats"), { recursive: true });
    const header = { t: "chat", id: chat.id, nodeId: chat.nodeId, createdAt: chat.createdAt };
    const lines = [header, ...chat.events].map((line) => `${JSON.stringify(line)}\n`).join("");
    await fsp.writeFile(path.join(planDir, "chats", `${chat.id}.jsonl`), lines);
  }
  await fsp.writeFile(
    path.join(planDir, "plan.json"),
    json({ format: 1, id: plan.planId, createdAt: plan.createdAt, profile: "software" }),
  );
}

/** Ids of scenario `unreadable`, for tests. */
export const UNREADABLE_SEED = {
  rag: {
    planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P1",
    title: "Eigenes produktives RAG",
    rootId: "01JDQ7Z8M3A6Y2W4X5V7T9R1A1",
    /** Node "Datenquellen und Ingestion" with Git conflict markers. */
    conflictNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1A2",
    /** Node "Retrieval" with a result and a chat. */
    resultNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1A3",
  },
  monitoring: { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P2", title: "Monitoring-Konzept", rootId: "01JDQ7Z8M3A6Y2W4X5V7T9R1B1" },
  inconsistent: {
    planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P3",
    title: "Altes Experiment",
    rootId: "01JDQ7Z8M3A6Y2W4X5V7T9R1C1",
    /** Node whose parent does not exist (edited by hand). */
    orphanNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1C2",
  },
  damaged: { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P4", rootId: "01JDQ7Z8M3A6Y2W4X5V7T9R1D1" },
  newer: { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P5", title: "Zukunftsplan", rootId: "01JDQ7Z8M3A6Y2W4X5V7T9R1E1" },
} as const;

const RAG_CREATED_AT = "2026-11-03T10:00:00.000Z";

function ragConflictNode(objective: string): Record<string, unknown> {
  const { rag } = UNREADABLE_SEED;
  return {
    id: rag.conflictNodeId,
    parentId: rag.rootId,
    position: "a1",
    title: "Datenquellen und Ingestion",
    objective,
    createdAt: RAG_CREATED_AT,
    updatedAt: RAG_CREATED_AT,
  };
}

/** Content of the conflicted node file after the planner resolved the conflict (AC-REQ-072-03). */
export function resolvedRagConflictNode(): string {
  return json(ragConflictNode("Quellen festlegen"));
}

async function seedUnreadable(projectFolder: string): Promise<void> {
  const { rag, monitoring, inconsistent, damaged, newer } = UNREADABLE_SEED;
  await writeSeedArea(projectFolder);

  // git_conflict: a node file of "Eigenes produktives RAG" contains Git conflict markers (AC-REQ-072-01).
  await writeSeedPlan(projectFolder, {
    planId: rag.planId,
    createdAt: RAG_CREATED_AT,
    nodes: [
      { id: rag.rootId, parentId: null, title: rag.title, objective: "Produktives RAG für interne Dokumente planen" },
      { id: rag.conflictNodeId, parentId: rag.rootId, title: "Datenquellen und Ingestion" },
      { id: rag.resultNodeId, parentId: rag.rootId, title: "Retrieval" },
    ],
    results: [
      {
        id: "01JDQ7Z8M3A6Y2W4X5V7T9R1F1",
        nodeId: rag.resultNodeId,
        status: "concept",
        content: "Hybride Suche",
        createdAt: "2026-11-04T10:00:00.000Z",
      },
    ],
    chats: [
      {
        id: "01JDQ7Z8M3A6Y2W4X5V7T9R1G1",
        nodeId: rag.resultNodeId,
        createdAt: "2026-11-04T09:00:00.000Z",
        events: [
          { t: "planner_message", id: "01JDQ7Z8M3A6Y2W4X5V7T9R1G2", text: "Welche Suche passt?", at: "2026-11-04T09:00:00.000Z" },
        ],
      },
    ],
  });
  const ours = json(ragConflictNode(""));
  const theirs = json(ragConflictNode("Quellen festlegen"));
  await fsp.writeFile(
    path.join(projectFolder, ".ramifold", "plans", rag.planId, "nodes", `${rag.conflictNodeId}.json`),
    `<<<<<<< HEAD\n${ours}=======\n${theirs}>>>>>>> origin/main\n`,
  );

  // Readable, with a chat whose node does not exist: no read error (TechSpec 2.3, Owner-Hinweis 2).
  await writeSeedPlan(projectFolder, {
    planId: monitoring.planId,
    createdAt: "2026-11-12T08:00:00.000Z",
    nodes: [{ id: monitoring.rootId, parentId: null, title: monitoring.title }],
    chats: [
      {
        id: "01JDQ7Z8M3A6Y2W4X5V7T9R1H1",
        nodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1Z9",
        createdAt: "2026-11-12T09:00:00.000Z",
        events: [{ t: "planner_message", id: "01JDQ7Z8M3A6Y2W4X5V7T9R1H2", text: "Verwaist", at: "2026-11-12T09:00:00.000Z" }],
      },
    ],
  });

  // inconsistent: a node points to a parent that does not exist (AC-REQ-072-04).
  await writeSeedPlan(projectFolder, {
    planId: inconsistent.planId,
    createdAt: "2026-11-20T08:00:00.000Z",
    nodes: [
      { id: inconsistent.rootId, parentId: null, title: inconsistent.title },
      { id: inconsistent.orphanNodeId, parentId: "01JDQ7Z8M3A6Y2W4X5V7T9R1Z8", title: "Verwaister Knoten" },
    ],
  });

  // damaged: the root node file cannot be parsed, so the title is not readable ("(untitled)").
  await writeSeedPlan(projectFolder, {
    planId: damaged.planId,
    createdAt: "2026-11-21T08:00:00.000Z",
    nodes: [{ id: damaged.rootId, parentId: null, title: "Kaputt" }],
  });
  await fsp.writeFile(path.join(projectFolder, ".ramifold", "plans", damaged.planId, "nodes", `${damaged.rootId}.json`), '{"id": ');

  // newer_version: plan.json with format 2.
  await writeSeedPlan(projectFolder, {
    planId: newer.planId,
    createdAt: "2026-11-22T08:00:00.000Z",
    nodes: [{ id: newer.rootId, parentId: null, title: newer.title }],
  });
  await fsp.writeFile(
    path.join(projectFolder, ".ramifold", "plans", newer.planId, "plan.json"),
    json({ format: 2, id: newer.planId, createdAt: "2026-11-22T08:00:00.000Z", profile: "software" }),
  );
}

export const SEED_SCENARIOS: Readonly<Record<string, SeedScenario>> = {
  /** An empty project folder: no Ramifold area, no plans (UI-001.empty). */
  empty: async () => {},
  /** One plan per unreadable cause and a readable plan with a chat without node (TechSpec 2.3 Prüfhinweise). */
  unreadable: seedUnreadable,
};
