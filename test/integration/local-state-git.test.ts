import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AreaInitializer } from "../../src/server/area/area-initializer";
import { areaPaths } from "../../src/server/area/area-paths";
import { LocalStateFiles } from "../../src/server/area/local-state-files";
import { systemClock } from "../../src/server/clock";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// sessions.json never appears in Git (TechSpec 3.2, 2.14): checked with real git.

let project: TempProject;
beforeEach(async () => (project = await createTempProject({ git: true })));
afterEach(() => project.cleanup());

describe("sessions.json in a Git repository", () => {
  it("stays out of git status and git add -A", async () => {
    const paths = areaPaths(project.dir);
    await new AreaInitializer(paths, systemClock).ensureArea();
    await new LocalStateFiles(paths).writeSession("01JDZ0000000000000000CHAT1", {
      agent: "claude-code",
      sessionId: "session-1",
      contextFingerprint: "a".repeat(64),
      historyThroughMessageId: null,
      knownThroughMessageId: "01JDZ00000000000000000ANS1",
      updatedAt: "2026-11-25T08:00:00.000Z",
    });

    const status = await project.git("status", "--porcelain", "--untracked-files=all");
    expect(status.split("\n").filter(Boolean).sort()).toEqual(["?? .ramifold/.gitignore", "?? .ramifold/area.json"]);
    expect(await project.git("check-ignore", ".ramifold/local/sessions.json")).toBe(".ramifold/local/sessions.json\n");

    await project.git("add", "-A");
    expect((await project.git("diff", "--cached", "--name-only")).split("\n").filter(Boolean).sort()).toEqual([
      ".ramifold/.gitignore",
      ".ramifold/area.json",
    ]);
  });
});
