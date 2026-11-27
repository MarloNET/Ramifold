import os from "node:os";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { writePlanFiles } from "../helpers/plan-files";
import { expect, ramifoldTest as test } from "./fixtures";

// UI-001 project list (docs/ux/screens/UI-001-project-list/screen.md). Wording from the design.

function displayPath(folder: string): string {
  const home = os.homedir();
  return folder.startsWith(home + path.sep) ? `~${folder.slice(home.length)}` : folder;
}

test("UI-001.empty: shows the hint and the action New project, without axe violations", async ({ page, project }) => {
  await page.goto("/");

  await expect(page.getByText("No project in this folder yet.")).toBeVisible();
  const newProject = page.getByRole("button", { name: "New project" });
  await expect(newProject).toHaveCount(1);
  await expect(newProject.locator('[data-icon="new-project"]')).toHaveCount(1);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

  // Header: brand, project folder with ~ and full path as tooltip, "Simulated AI" (RAMIFOLD_AGENT=fake), "Data notice".
  const header = page.getByRole("banner");
  await expect(header.getByText("Ramifold", { exact: true })).toBeVisible();
  const folder = header.getByText(`Project folder: ${displayPath(project.dir)}`);
  await expect(folder).toBeVisible();
  await expect(folder).toHaveAttribute("title", project.dir);
  await expect(header.getByText("Simulated AI")).toBeVisible();
  await expect(header.locator('[data-icon="simulated-ai"]')).toHaveCount(1);
  await expect(header.getByRole("link", { name: "Data notice" })).toBeVisible();
  await expect(page).toHaveTitle(`Projects – ${path.basename(project.dir)} – Ramifold`);

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

test("UI-001.loading: shows Loading projects… until the list arrives", async ({ page }) => {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/plans", async (route) => {
    await released;
    await route.fallback();
  });
  await page.goto("/");

  await expect(page.getByText("Loading projects…")).toBeVisible();
  await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0);
  release();
  await expect(page.getByText("No project in this folder yet.")).toBeVisible();
  await expect(page.getByText("Loading projects…")).toHaveCount(0);
});

test.describe("UI-001.default", () => {
  test.use({ timezoneId: "Europe/Berlin" });

  test("lists the plans with Title and Created, oldest first, date in local time", async ({ page, project }) => {
    await writePlanFiles(project.dir, {
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P2",
      rootNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1Q2",
      title: "Migration Billing-Service",
      createdAt: "2026-11-12T08:00:00.000Z",
    });
    await writePlanFiles(project.dir, {
      planId: "01JDQ7Z8M3A6Y2W4X5V7T9R1P1",
      rootNodeId: "01JDQ7Z8M3A6Y2W4X5V7T9R1Q1",
      title: "Eigenes produktives RAG",
      // 23:30 UTC on Nov 2 is Nov 3 in Berlin.
      createdAt: "2026-11-02T23:30:00.000Z",
    });
    await page.goto("/");

    const table = page.getByRole("table");
    await expect(table.getByRole("columnheader")).toHaveText(["Title", "Created", "Actions"]);
    const rows = table.getByRole("row").filter({ has: page.getByRole("cell") });
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).getByRole("cell")).toHaveText(["Eigenes produktives RAG", "Nov 3, 2026", ""]);
    await expect(rows.nth(1).getByRole("cell")).toHaveText(["Migration Billing-Service", "Nov 12, 2026", ""]);
    await expect(rows.nth(0).getByRole("link", { name: "Eigenes produktives RAG" })).toHaveAttribute(
      "href",
      "/plans/01JDQ7Z8M3A6Y2W4X5V7T9R1P1",
    );
    // In the default state "New project" sits in the title row.
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(1);
    await expect(page.getByText("No project in this folder yet.")).toHaveCount(0);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
  });

  // CR-165-03: "bei Überlänge mittig mit „…“ gekürzt, voller Pfad als Tooltip/title" (UI-001 screen.md, Kopfzeile).
  test("shortens an overlong project folder in the middle with …, the folder name stays visible", async ({
    page,
    project,
  }) => {
    await page.goto("/");
    const folder = page.getByRole("banner").getByText(`Project folder: ${displayPath(project.dir)}`);
    await expect(folder).toHaveAttribute("title", project.dir);
    // Make the path overlong for the available width.
    await folder.evaluate((element) => ((element as HTMLElement).style.maxWidth = "200px"));

    const parts = await folder.evaluate((element) =>
      Array.from(element.children, (child) => {
        const style = getComputedStyle(child);
        return {
          text: child.textContent,
          clipped: child.scrollWidth > child.clientWidth,
          ellipsis: style.textOverflow === "ellipsis",
          right: child.getBoundingClientRect().right,
        };
      }),
    );
    const box = (await folder.boundingBox())!;
    expect(parts).toHaveLength(2);
    const [head, tail] = parts as [(typeof parts)[0], (typeof parts)[0]];
    // The beginning ends in "…", the end with the folder name is shown completely and within the header.
    expect(head.clipped && head.ellipsis).toBe(true);
    expect(tail.text).toBe(`/${path.basename(project.dir)}`);
    expect(tail.clipped).toBe(false);
    expect(tail.right).toBeLessThanOrEqual(box.x + box.width + 0.5);
  });
});
