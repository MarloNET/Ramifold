import { constants } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { AreaPaths } from "./area-paths";
import { nodeFileSchema, planFileSchema } from "./file-schemas";

// The only interface to the files in `.ramifold/` (TechSpec 4.3, REQ-052), plus the check of the project folder
// itself (start step 3), because only `area` may use node:fs (TechSpec 4.1).

export type ProjectFolderCheck =
  | { status: "ok"; canonicalPath: string }
  | { status: "missing" | "not_a_folder" | "not_writable" };

/** Start step 3: `stat`, `access(W_OK | X_OK)`, then `realpath` (TechSpec 2.1). */
export async function inspectProjectFolder(absolutePath: string): Promise<ProjectFolderCheck> {
  let stats;
  try {
    stats = await fsp.stat(absolutePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { status: "missing" };
    throw error;
  }
  if (!stats.isDirectory()) return { status: "not_a_folder" };
  try {
    await fsp.access(absolutePath, constants.W_OK | constants.X_OK);
  } catch {
    return { status: "not_writable" };
  }
  return { status: "ok", canonicalPath: await fsp.realpath(absolutePath) };
}

export type PlanSummary = { planId: string; createdAt: string | null; title: string | null };

export class AreaStore {
  constructor(private readonly paths: AreaPaths) {}

  /**
   * Reads every folder in `plans/` that contains `plan.json`: creation date from plan.json and the title of the
   * root node. Parts that cannot be read are null; the readability check (TechSpec 2.3) follows with task #74.
   */
  async readPlanSummaries(): Promise<PlanSummary[]> {
    let entries;
    try {
      entries = await fsp.readdir(this.paths.plans, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const summaries: PlanSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const planJson = await readJson(this.paths.planJson(entry.name));
      if (planJson === MISSING) continue;
      const plan = planFileSchema.safeParse(planJson);
      summaries.push({
        planId: entry.name,
        createdAt: plan.success ? plan.data.createdAt : null,
        title: await this.readRootTitle(entry.name),
      });
    }
    return summaries;
  }

  private async readRootTitle(planId: string): Promise<string | null> {
    const nodesDir = this.paths.nodesDir(planId);
    const files = await fsp.readdir(nodesDir).catch(() => []);
    for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
      const node = nodeFileSchema.safeParse(await readJson(path.join(nodesDir, file)));
      if (node.success && node.data.parentId === null) return node.data.title;
    }
    return null;
  }
}

const MISSING = Symbol("missing");

/** Parsed JSON, `MISSING` if the file does not exist, null if it cannot be read or parsed. */
async function readJson(file: string): Promise<unknown> {
  let text;
  try {
    text = await fsp.readFile(file, "utf8");
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? MISSING : null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
