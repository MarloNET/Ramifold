import path from "node:path";

/** All paths of the Ramifold area `<project>/.ramifold` (TechSpec 2.14, 3.1, 3.2). */
export type AreaPaths = ReturnType<typeof areaPaths>;

export function areaPaths(projectFolder: string) {
  const root = path.join(projectFolder, ".ramifold");
  const plans = path.join(root, "plans");
  const local = path.join(root, "local");
  const planDir = (planId: string) => path.join(plans, planId);
  return {
    projectFolder,
    root,
    gitignore: path.join(root, ".gitignore"),
    areaJson: path.join(root, "area.json"),
    plans,
    local,
    localGitignore: path.join(local, ".gitignore"),
    localTmp: path.join(local, "tmp"),
    sessionsJson: path.join(local, "sessions.json"),
    errorsLog: path.join(local, "errors.log"),
    instanceLock: path.join(local, "instance.lock"),
    planDir,
    planJson: (planId: string) => path.join(planDir(planId), "plan.json"),
    nodesDir: (planId: string) => path.join(planDir(planId), "nodes"),
  };
}
