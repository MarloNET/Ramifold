import type { Dirent } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { AreaPaths } from "./area-paths";
import { validatePlanTree, type PlanTreeCheck, type RawPlanFile, type RawPlanFiles } from "./plan-validator";

// Reads the plan files of `plans/<planId>/` completely, chats included (TechSpec 2.3 "Laden", 2.14), without
// following a symbolic link (rule 0, v0.13, N-06): the plan folder with `lstat`, everything below with
// `readdir(…, {withFileTypes: true})`. A link is recorded and never opened. `PLAN.md` and temp files (`*.tmp-*`) are
// never read. Only reads; never writes.

/** null when the folder or its `plan.json` does not exist (aborted creation, ignored); otherwise the check result. */
export async function loadPlanFromDisk(paths: AreaPaths, planId: string): Promise<PlanTreeCheck | null> {
  const planDir = paths.planDir(planId);
  const raw: RawPlanFiles = { planId, symlinks: [], planJson: "", nodes: [], results: [], chats: [] };

  let planDirStats;
  try {
    planDirStats = await fsp.lstat(planDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (planDirStats.isSymbolicLink()) return validatePlanTree({ ...raw, symlinks: [""] });
  if (!planDirStats.isDirectory()) return null;

  const top = await readDir(planDir);
  const planJson = top.get("plan.json");
  if (planJson === undefined) return null;
  if (planJson.isSymbolicLink()) raw.symlinks.push("plan.json");
  else raw.planJson = await readText(path.join(planDir, "plan.json"));

  raw.nodes = await readFiles(raw, planDir, top.get("nodes"), "nodes", ".json");
  const results = top.get("results");
  if (results?.isSymbolicLink()) raw.symlinks.push("results");
  else if (results?.isDirectory()) {
    for (const folder of [...(await readDir(path.join(planDir, "results"))).values()]) {
      if (isIgnored(folder.name)) continue;
      const files = await readFiles(raw, path.join(planDir, "results"), folder, `results/${folder.name}`, ".json");
      raw.results.push(...files.map((file) => ({ name: `${folder.name}/${file.name}`, text: file.text })));
    }
  }
  raw.chats = await readFiles(raw, planDir, top.get("chats"), "chats", ".jsonl");
  return validatePlanTree(raw);
}

/**
 * Reads the files with the extension in the folder entry `dirent` (relative path `relDir` in the plan folder),
 * sorted by name. Links (the folder itself or a file) go to `raw.symlinks` and are not read.
 */
async function readFiles(
  raw: RawPlanFiles,
  parentDir: string,
  dirent: Dirent | undefined,
  relDir: string,
  extension: string,
): Promise<RawPlanFile[]> {
  if (dirent === undefined) return [];
  if (dirent.isSymbolicLink()) {
    raw.symlinks.push(relDir);
    return [];
  }
  if (!dirent.isDirectory()) return [];
  const dir = path.join(parentDir, dirent.name);
  const files: RawPlanFile[] = [];
  for (const entry of (await readDir(dir)).values()) {
    if (!entry.name.endsWith(extension) || isIgnored(entry.name)) continue;
    if (entry.isSymbolicLink()) raw.symlinks.push(`${relDir}/${entry.name}`);
    else if (entry.isFile()) files.push({ name: entry.name, text: await readText(path.join(dir, entry.name)) });
  }
  return files;
}

/** Entries of a folder by name, sorted by name; a missing folder has no entries. */
async function readDir(dir: string): Promise<Map<string, Dirent>> {
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return new Map(entries.map((entry) => [entry.name, entry]));
}

/** A file that cannot be read (for example no permission, or removed meanwhile) counts as not parsable (rule 3). */
async function readText(file: string): Promise<string> {
  return fsp.readFile(file, "utf8").catch(() => "");
}

function isIgnored(name: string): boolean {
  return name.includes(".tmp-");
}
