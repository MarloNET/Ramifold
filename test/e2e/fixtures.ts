import { test as base, expect } from "@playwright/test";
import { SEED_SCENARIOS } from "../../tools/seed/seed-scenarios";
import { startRamifold, type RunningRamifold } from "../helpers/ramifold-process";
import { createTempProject, type TempProject } from "../helpers/temp-project";

// Playwright fixture per test: own project folder (seed scenario), own Ramifold instance on a free port,
// baseURL of that instance. Requests to other hosts than the instance are blocked (no network). Console errors
// (for example CSP violations) fail the test.

type RamifoldFixtures = {
  scenario: keyof typeof SEED_SCENARIOS;
  /** Environment of the instance on top of startRamifold's (which sets RAMIFOLD_AGENT=fake). */
  ramifoldEnv: Record<string, string | undefined>;
  project: TempProject;
  ramifold: RunningRamifold;
};

export const ramifoldTest = base.extend<RamifoldFixtures>({
  scenario: ["empty", { option: true }],
  ramifoldEnv: [{}, { option: true }],
  project: async ({ scenario }, use) => {
    const project = await createTempProject();
    await SEED_SCENARIOS[scenario]!(project.dir);
    await use(project);
    await project.cleanup();
  },
  ramifold: async ({ project, ramifoldEnv }, use) => {
    const ramifold = await startRamifold({ folder: project.dir, env: ramifoldEnv });
    await use(ramifold);
    await ramifold.stop();
  },
  baseURL: async ({ ramifold }, use) => use(ramifold.url),
  context: async ({ context }, use) => {
    await context.route("**/*", (route) => {
      const { hostname } = new URL(route.request().url());
      return hostname === "127.0.0.1" ? route.fallback() : route.abort();
    });
    await use(context);
  },
  page: async ({ page }, use) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await use(page);
    expect(consoleErrors).toEqual([]);
  },
});

export { expect };
