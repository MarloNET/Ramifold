import fsp from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { resolvedRagConflictNode, UNREADABLE_SEED } from "../../tools/seed/seed-scenarios";
import { checksums } from "../helpers/checksums";
import { startRamifold } from "../helpers/ramifold-process";
import { expect, ramifoldTest as test } from "./fixtures";

// Unreadable plans in UI-001 (permission/disabled) and the dialog UI-011 via "Details"
// (docs/ux/screens/UI-001-project-list/screen.md, UI-011-project-unreadable/screen.md; TechSpec 2.3, 2.16).
// The open attempt via /plans/<planId> follows with task #75.

const { rag, monitoring, inconsistent, damaged, newer } = UNREADABLE_SEED;
const DIALOG_TEXT = "Ramifold cannot read the data of this project. Ramifold did not change anything.";
const INSTRUCTION =
  "Resolve the problem in your project folder, restart Ramifold, and open the project again. Your other projects are not affected.";

test.use({ scenario: "unreadable" });

const row = (page: Page, title: string) => page.getByRole("row").filter({ has: page.getByRole("cell", { name: title }) });
const planFolder = (projectDir: string, planId: string) => path.join(projectDir, ".ramifold", "plans", planId);

async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
}

test("UI-001.permission / UI-001.disabled (AC-REQ-072-01, DER-18-01): unreadable row without link, Not readable, Details; files unchanged", async ({
  page,
  project,
}) => {
  const before = await checksums(planFolder(project.dir, rag.planId));
  await page.goto("/");

  const ragRow = row(page, rag.title);
  await expect(ragRow).toHaveCount(1);
  await expect(ragRow.getByRole("link")).toHaveCount(0);
  const mark = ragRow.getByText("Not readable");
  await expect(mark).toBeVisible();
  await expect(mark.locator('[data-icon="warning"]')).toHaveCount(1);
  await expect(ragRow.getByRole("button", { name: "Details" })).toBeVisible();
  // Title as muted text.
  const titleColor = await ragRow.getByText(rag.title, { exact: true }).evaluate((e) => getComputedStyle(e).color);
  const mutedColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--text-muted)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  expect(titleColor).toBe(mutedColor);

  // Only unreadable rows are not opening: the readable plan keeps its link and has no Details.
  const monitoringRow = row(page, monitoring.title);
  await expect(monitoringRow.getByRole("link", { name: monitoring.title })).toHaveAttribute("href", `/plans/${monitoring.planId}`);
  await expect(monitoringRow.getByRole("button", { name: "Details" })).toHaveCount(0);
  await expect(monitoringRow.getByText("Not readable")).toHaveCount(0);

  // The damaged plan has no readable title.
  await expect(row(page, "(untitled)").getByText("Not readable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Details" })).toHaveCount(4);

  await expectNoAxeViolations(page);
  expect(await checksums(planFolder(project.dir, rag.planId))).toEqual(before);
});

test("UI-011.default (AC-REQ-072-01, DER-18-02): Details opens the error dialog with cause and location, no repair", async ({
  page,
  project,
}) => {
  const before = await checksums(planFolder(project.dir, rag.planId));
  await page.goto("/");
  await row(page, rag.title).getByRole("button", { name: "Details" }).click();

  const dialog = page.getByRole("alertdialog", { name: `${rag.title} cannot be opened` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(`${rag.title} cannot be opened`);
  await expect(dialog.locator('[data-icon="error"]')).toHaveCount(1);
  await expect(dialog.getByText(DIALOG_TEXT)).toBeVisible();
  await expect(dialog.locator("dt")).toHaveText(["Cause", "Location"]);
  await expect(dialog.locator("dd")).toHaveText([
    "Git conflict",
    `.ramifold/plans/${rag.planId}/nodes/${rag.conflictNodeId}.json`,
  ]);
  await expect(dialog.locator("dd code")).toHaveCSS("font-family", /Plex Mono/);
  await expect(dialog.getByText(INSTRUCTION)).toBeVisible();
  // No repair and no "Try again": Close is the only action.
  await expect(dialog.getByRole("button")).toHaveText(["Close"]);

  await expectNoAxeViolations(page);
  expect(await checksums(planFolder(project.dir, rag.planId))).toEqual(before);
});

test("UI-011 Cause/Location (DER-18-04, AC-REQ-072-04): one cause per plan, untitled plan", async ({ page }) => {
  await page.goto("/");
  const cases = [
    {
      rowTitle: inconsistent.title,
      heading: `${inconsistent.title} cannot be opened`,
      cause: "Inconsistent data",
      location: `.ramifold/plans/${inconsistent.planId}/nodes/${inconsistent.orphanNodeId}.json`,
    },
    {
      rowTitle: "(untitled)",
      heading: "This project cannot be opened",
      cause: "Damaged data",
      location: `.ramifold/plans/${damaged.planId}/nodes/${damaged.rootId}.json`,
    },
    {
      rowTitle: newer.title,
      heading: `${newer.title} cannot be opened`,
      cause: "Data from a newer Ramifold version",
      location: `.ramifold/plans/${newer.planId}/plan.json`,
    },
  ];
  for (const c of cases) {
    await row(page, c.rowTitle).getByRole("button", { name: "Details" }).click();
    const dialog = page.getByRole("alertdialog", { name: c.heading });
    await expect(dialog.locator("dd")).toHaveText([c.cause, c.location]);
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test("UI-011 Close (DER-18-03): initial focus on Close, focus trap, ESC and Close return the focus to Details", async ({ page }) => {
  await page.goto("/");
  const details = row(page, rag.title).getByRole("button", { name: "Details" });

  // Keyboard: Details with Enter, ESC closes.
  await details.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog");
  const close = dialog.getByRole("button", { name: "Close" });
  await expect(close).toBeFocused();
  // Modal: the page behind the dialog is inert (React Aria `ariaHideOutside`).
  await expect(page.locator("#root")).toHaveAttribute("inert");
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(close).toBeFocused();
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(details).toBeFocused();

  // Mouse: Details and Close.
  await details.click();
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toHaveCount(0);
  await expect(details).toBeFocused();

  // Keyboard: Close with Enter.
  await page.keyboard.press("Enter");
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(details).toBeFocused();
});

test("UI-001 (DER-18-05): one terminal message and one error log entry per unreadable plan and instance", async ({
  page,
  project,
  ramifold,
}) => {
  await page.goto("/");
  await expect(page.getByText("Not readable")).toHaveCount(4);
  await page.reload();
  await expect(page.getByText("Not readable")).toHaveCount(4);
  await expectNoAxeViolations(page);

  const terminal = ramifold.stdout() + ramifold.stderr();
  const errorsLog = await fsp.readFile(path.join(project.dir, ".ramifold", "local", "errors.log"), "utf8");
  for (const planId of [rag.planId, inconsistent.planId, damaged.planId, newer.planId]) {
    expect(terminal.split("\n").filter((l) => l.includes("plan_unreadable") && l.includes(planId))).toHaveLength(1);
    expect(errorsLog.split("\n").filter((l) => l.includes("plan_unreadable") && l.includes(planId))).toHaveLength(1);
  }
  expect(terminal).not.toContain(monitoring.planId);
});

test("UI-001.default (AC-REQ-072-03): after resolving the conflict and a restart the row is readable", async ({
  page,
  project,
  ramifold,
}) => {
  await page.goto("/");
  await expect(row(page, rag.title).getByText("Not readable")).toBeVisible();

  // Ramifold ends; leave the page first so that the closed event stream is no console error.
  await page.goto("about:blank");
  await ramifold.stop();
  await fsp.writeFile(path.join(planFolder(project.dir, rag.planId), "nodes", `${rag.conflictNodeId}.json`), resolvedRagConflictNode());
  const restarted = await startRamifold({ folder: project.dir });
  try {
    await page.goto(restarted.url);
    const ragRow = row(page, rag.title);
    await expect(ragRow.getByRole("link", { name: rag.title })).toBeVisible();
    await expect(ragRow.getByText("Not readable")).toHaveCount(0);
    await expect(ragRow.getByRole("button", { name: "Details" })).toHaveCount(0);
    await expectNoAxeViolations(page);
  } finally {
    // The orderly shutdown ends the event stream mid-response; leave the page first, as above.
    await page.goto("about:blank");
    await restarted.stop();
  }
});
