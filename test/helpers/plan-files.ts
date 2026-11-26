import fsp from "node:fs/promises";
import path from "node:path";

// Writes minimal plan files in the format of TechSpec 3.1 for tests (plan.json and the root node).
export async function writePlanFiles(
  projectFolder: string,
  plan: { planId: string; rootNodeId: string; title: string; createdAt: string },
): Promise<void> {
  const planDir = path.join(projectFolder, ".ramifold", "plans", plan.planId);
  await fsp.mkdir(path.join(planDir, "nodes"), { recursive: true });
  const root = {
    id: plan.rootNodeId,
    parentId: null,
    position: "a0",
    title: plan.title,
    objective: "",
    createdAt: plan.createdAt,
    updatedAt: plan.createdAt,
  };
  await fsp.writeFile(path.join(planDir, "nodes", `${plan.rootNodeId}.json`), `${JSON.stringify(root, null, 2)}\n`);
  const planJson = { format: 1, id: plan.planId, createdAt: plan.createdAt, profile: "software" };
  await fsp.writeFile(path.join(planDir, "plan.json"), `${JSON.stringify(planJson, null, 2)}\n`);
}
