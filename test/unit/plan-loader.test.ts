import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { areaPaths } from "../../src/server/area/area-paths";
import { loadPlanFromDisk } from "../../src/server/area/plan-loader";
import { UNREADABLE_SEED, writeSeedArea, writeSeedPlan } from "../../tools/seed/seed-scenarios";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// TechSpec 2.3 "Laden" and rule 0 (v0.13, N-06), 2.14 "Mehrere Chats je Knoten"; DER-18-04 to DER-18-08.

const PLAN = "01JDQ7Z8M3A6Y2W4X5V7T9R1Q1";
const ROOT = "01JDQ7Z8M3A6Y2W4X5V7T9R1Q2";
const CHILD = "01JDQ7Z8M3A6Y2W4X5V7T9R1Q3";
const OLD_CHAT = "01JDQ7Z8M3A6Y2W4X5V7T9R1Q9";
const NEW_CHAT = "01JDQ7Z8M3A6Y2W4X5V7T9R1Q8";
const AT = "2026-11-03T10:00:00.000Z";

let project: TempProject;
afterEach(() => project.cleanup());

const load = (planId = PLAN) => loadPlanFromDisk(areaPaths(project.dir), planId);
const planDir = () => path.join(project.dir, ".ramifold", "plans", PLAN);
const base = `.ramifold/plans/${PLAN}`;

async function seedPlan() {
  project = await createTempProject();
  await writeSeedArea(project.dir);
  await writeSeedPlan(project.dir, {
    planId: PLAN,
    createdAt: AT,
    nodes: [
      { id: ROOT, parentId: null, title: "Plan" },
      { id: CHILD, parentId: ROOT, title: "Kind" },
    ],
    results: [{ id: "01JDQ7Z8M3A6Y2W4X5V7T9R1R1", nodeId: CHILD, status: "fixed", content: "Fest", createdAt: AT }],
    chats: [
      { id: NEW_CHAT, nodeId: CHILD, createdAt: "2026-11-05T10:00:00.000Z", events: [] },
      {
        id: OLD_CHAT,
        nodeId: CHILD,
        createdAt: "2026-11-04T10:00:00.000Z",
        events: [{ t: "planner_message", id: "01JDQ7Z8M3A6Y2W4X5V7T9R1M1", text: "Frage", at: AT }],
      },
    ],
  });
}

/** SHA-256 of every file below the folder, links by their target path (never followed). */
async function checksums(dir: string): Promise<Record<string, string>> {
  const sums: Record<string, string> = {};
  for (const entry of await fsp.readdir(dir, { withFileTypes: true, recursive: true })) {
    const file = path.join(entry.parentPath, entry.name);
    const content = entry.isSymbolicLink() ? await fsp.readlink(file) : entry.isFile() ? await fsp.readFile(file) : null;
    if (content !== null) sums[path.relative(dir, file)] = createHash("sha256").update(content).digest("hex");
  }
  return sums;
}

async function outsideFile(name: string, content = "{}\n") {
  const file = path.join(project.dir, "outside", name);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, content);
  return file;
}

describe("loadPlanFromDisk", () => {
  it("loads tree, results and chats completely", async () => {
    await seedPlan();
    const check = await load();
    expect(check?.readable).toBe(true);
    if (!check?.readable) return;
    expect(check.plan.nodes.map((n) => n.title)).toEqual(["Plan", "Kind"]);
    expect(check.plan.results.get(CHILD)?.[0]?.content).toBe("Fest");
    expect(check.plan.chats.get(CHILD)?.events).toHaveLength(1);
  });

  it("DER-18-06: two chat files for one node: readable, the oldest chat counts, the other stays byte-identical", async () => {
    await seedPlan();
    const before = await checksums(planDir());
    const check = await load();
    expect(check?.readable && check.plan.chats.get(CHILD)?.chatId).toBe(OLD_CHAT);
    expect(await checksums(planDir())).toEqual(before);
  });

  it("DER-18-05: a folder without plan.json (aborted creation) and a missing folder are ignored", async () => {
    await seedPlan();
    await fsp.rm(path.join(planDir(), "plan.json"));
    await expect(load()).resolves.toBeNull();
    await expect(load("01JDQ7Z8M3A6Y2W4X5V7T9R1ZZ")).resolves.toBeNull();
  });

  it("scenario unreadable: one cause per plan, location relative to the project folder, files unchanged", async () => {
    project = await createTempProject({ scenario: "unreadable" });
    const area = path.join(project.dir, ".ramifold");
    const before = await checksums(area);
    const { rag, monitoring, inconsistent, damaged, newer } = UNREADABLE_SEED;
    const expectUnreadable = async (planId: string, cause: string, location: string, title: string | null) =>
      expect(await load(planId)).toMatchObject({ readable: false, cause, location, title });

    await expectUnreadable(rag.planId, "git_conflict", `.ramifold/plans/${rag.planId}/nodes/${rag.conflictNodeId}.json`, rag.title);
    await expectUnreadable(
      inconsistent.planId,
      "inconsistent",
      `.ramifold/plans/${inconsistent.planId}/nodes/${inconsistent.orphanNodeId}.json`,
      inconsistent.title,
    );
    await expectUnreadable(damaged.planId, "damaged", `.ramifold/plans/${damaged.planId}/nodes/${damaged.rootId}.json`, null);
    await expectUnreadable(newer.planId, "newer_version", `.ramifold/plans/${newer.planId}/plan.json`, newer.title);
    expect((await load(monitoring.planId))?.readable).toBe(true);
    expect(await checksums(area)).toEqual(before);
  });
});

describe("loadPlanFromDisk: rule 0 symbolic links (DER-18-08)", () => {
  it("the plan folder as link: damaged with the plan folder, the target is not read", async () => {
    await seedPlan();
    const target = path.join(project.dir, "outside", "plan");
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.rename(planDir(), target);
    await fsp.symlink(target, planDir());
    const before = await checksums(target);
    await expect(load()).resolves.toMatchObject({ readable: false, cause: "damaged", location: base, title: null });
    expect(await checksums(target)).toEqual(before);
  });

  it("a node file as link", async () => {
    await seedPlan();
    const target = await outsideFile("node.json", await fsp.readFile(path.join(planDir(), "nodes", `${CHILD}.json`), "utf8"));
    await fsp.rm(path.join(planDir(), "nodes", `${CHILD}.json`));
    await fsp.symlink(target, path.join(planDir(), "nodes", `${CHILD}.json`));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/nodes/${CHILD}.json` });
  });

  it("chats/ as link, and a chat file as link", async () => {
    await seedPlan();
    const target = path.join(project.dir, "outside", "chats");
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.rename(path.join(planDir(), "chats"), target);
    await fsp.symlink(target, path.join(planDir(), "chats"));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/chats` });

    await fsp.rm(path.join(planDir(), "chats"));
    await fsp.mkdir(path.join(planDir(), "chats"));
    await fsp.symlink(path.join(target, `${OLD_CHAT}.jsonl`), path.join(planDir(), "chats", `${OLD_CHAT}.jsonl`));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/chats/${OLD_CHAT}.jsonl` });
  });

  it("plan.json, nodes/, results/ and a result folder as link", async () => {
    await seedPlan();
    const planJson = await outsideFile("plan.json", await fsp.readFile(path.join(planDir(), "plan.json"), "utf8"));
    await fsp.rm(path.join(planDir(), "plan.json"));
    await fsp.symlink(planJson, path.join(planDir(), "plan.json"));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/plan.json` });

    await fsp.rm(path.join(planDir(), "plan.json"));
    await fsp.copyFile(planJson, path.join(planDir(), "plan.json"));
    const results = path.join(project.dir, "outside-results");
    await fsp.rename(path.join(planDir(), "results", CHILD), results);
    await fsp.symlink(results, path.join(planDir(), "results", CHILD));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/results/${CHILD}` });

    await fsp.rename(path.join(planDir(), "results"), path.join(project.dir, "outside-results-folder"));
    await fsp.symlink(path.join(project.dir, "outside-results-folder"), path.join(planDir(), "results"));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/results` });

    await fsp.rename(path.join(planDir(), "nodes"), path.join(project.dir, "outside-nodes"));
    await fsp.symlink(path.join(project.dir, "outside-nodes"), path.join(planDir(), "nodes"));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/nodes` });
  });

  it("PLAN.md and temp files as link are no finding", async () => {
    await seedPlan();
    const target = await outsideFile("PLAN.md", "# outside\n");
    await fsp.symlink(target, path.join(planDir(), "PLAN.md"));
    await fsp.symlink(target, path.join(planDir(), "nodes", `${CHILD}.json.tmp-0a1b2c3d`));
    expect((await load())?.readable).toBe(true);
  });

  it("rule 0 comes before the other rules", async () => {
    await seedPlan();
    await fsp.writeFile(path.join(planDir(), "nodes", `${ROOT}.json`), "<<<<<<< HEAD\n");
    const target = await outsideFile("chat.jsonl");
    await fsp.mkdir(path.join(planDir(), "chats"), { recursive: true });
    await fsp.symlink(target, path.join(planDir(), "chats", "01JDQ7Z8M3A6Y2W4X5V7T9R1Q7.jsonl"));
    await expect(load()).resolves.toMatchObject({ cause: "damaged", location: `${base}/chats/01JDQ7Z8M3A6Y2W4X5V7T9R1Q7.jsonl` });
  });
});
