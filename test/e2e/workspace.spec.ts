import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { writeSeedArea, writeSeedPlan } from "../../tools/seed/seed-scenarios";
import { startRamifold } from "../helpers/ramifold-process";
import { expect, ramifoldTest as test } from "./fixtures";

// Opening a plan and reading its tree: UI-001 (open, error) and UI-003 (loading, tree rows, tooltip, keyboard,
// header, page title, plan column below 1024 px). docs/ux/screens/UI-001-project-list/screen.md,
// UI-003-workspace/screen.md; TechSpec 2.3, 2.4, 2.16.

const RAG = {
  planId: "01JDQ7Z8M3A6Y2W4X5V7T9R3P1",
  title: "Eigenes produktives RAG",
  root: "01JDQ7Z8M3A6Y2W4X5V7T9R3A0",
  n1: "01JDQ7Z8M3A6Y2W4X5V7T9R3A1",
  n2: "01JDQ7Z8M3A6Y2W4X5V7T9R3A2",
  n21: "01JDQ7Z8M3A6Y2W4X5V7T9R3A3",
  n3: "01JDQ7Z8M3A6Y2W4X5V7T9R3A4",
};
const MONITORING = { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R3P2", title: "Monitoring-Konzept", root: "01JDQ7Z8M3A6Y2W4X5V7T9R3B0" };
/** Shortened in a tree column of 320 px. */
const LONG_TITLE = "Betrieb, Monitoring und Kostenkontrolle der Retrieval-Pipeline";

/** Two plans; RAG with node 1 open, 2 concept, 2.1 fixed plan (AC-REQ-007-01) and a long title in node 3. */
async function seedPlans(projectFolder: string) {
  await writeSeedArea(projectFolder);
  await writeSeedPlan(projectFolder, {
    planId: RAG.planId,
    createdAt: "2026-11-03T10:00:00.000Z",
    nodes: [
      { id: RAG.root, parentId: null, title: RAG.title, position: "a0", objective: "Produktives RAG für interne Dokumente planen" },
      { id: RAG.n1, parentId: RAG.root, title: "Datenquellen und Ingestion", position: "a0" },
      { id: RAG.n2, parentId: RAG.root, title: "Retrieval", position: "a1" },
      { id: RAG.n21, parentId: RAG.n2, title: "Chunking", position: "a0" },
      { id: RAG.n3, parentId: RAG.root, title: LONG_TITLE, position: "a2" },
    ],
    results: [
      { id: "01JDQ7Z8M3A6Y2W4X5V7T9R3V1", nodeId: RAG.n2, status: "concept", content: "Hybride Suche", createdAt: "2026-11-04T10:00:00.000Z" },
      { id: "01JDQ7Z8M3A6Y2W4X5V7T9R3V2", nodeId: RAG.n21, status: "fixed", content: "512 Tokens", createdAt: "2026-11-04T11:00:00.000Z" },
    ],
  });
  await writeSeedPlan(projectFolder, {
    planId: MONITORING.planId,
    createdAt: "2026-11-12T08:00:00.000Z",
    nodes: [{ id: MONITORING.root, parentId: null, title: MONITORING.title }],
  });
}

const tree = (page: Page) => page.getByRole("treegrid", { name: "Plan" });
const treeRow = (page: Page, name: string) => tree(page).getByRole("row", { name, exact: true });

async function expectNoAxeViolations(page: Page) {
  // The h1 of UI-003 is the node header "<number> <title>" (NodeHeader), which comes with task #78; UI-001 has its h1.
  const axe = await new AxeBuilder({ page }).disableRules(["page-has-heading-one"]).analyze();
  expect(axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
}

async function openRag(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: RAG.title }).click();
  await expect(treeRow(page, `${RAG.title}, No result yet`)).toBeVisible();
}

test.beforeEach(async ({ project }) => {
  await seedPlans(project.dir);
});

test("AC-REQ-006-01: after a restart both plans are listed with title and date, each opens with its saved tree", async ({
  page,
  project,
  ramifold,
}) => {
  // Restart: the instance of the fixture ends, a new one starts on the same folder.
  await ramifold.stop();
  const restarted = await startRamifold({ folder: project.dir });
  try {
    await page.goto(restarted.url);
    const rows = page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell") });
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).getByRole("cell").nth(0)).toHaveText(RAG.title);
    await expect(rows.nth(0).getByRole("cell").nth(1)).toHaveText(/^Nov \d+, 2026$/);
    await expect(rows.nth(1).getByRole("cell").nth(0)).toHaveText(MONITORING.title);
    await expect(rows.nth(1).getByRole("cell").nth(1)).toHaveText(/^Nov \d+, 2026$/);

    await page.getByRole("link", { name: RAG.title }).click();
    await expect(page).toHaveURL(`${restarted.url}/plans/${RAG.planId}`);
    await expect(tree(page).getByRole("row")).toHaveCount(5);

    await page.getByRole("banner").getByRole("link", { name: "Projects" }).click();
    await page.getByRole("link", { name: MONITORING.title }).click();
    await expect(tree(page).getByRole("row")).toHaveCount(1);
    await expect(treeRow(page, `${MONITORING.title}, No result yet`)).toBeVisible();
  } finally {
    await page.goto("about:blank");
    await restarted.stop();
  }
});

test.describe("AC-REQ-006-02", () => {
  test.use({ scenario: "empty" });
  test.beforeEach(async ({ project }) => {
    // The outer beforeEach seeded plans; this case needs a folder without plans.
    await import("node:fs/promises").then((fsp) => fsp.rm(path.join(project.dir, ".ramifold"), { recursive: true }));
  });

  test("UI-001.empty: a folder without plans shows that none exists and offers New project", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("No project in this folder yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "New project" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("UI-001.error (DER-19-01)", () => {
  test.use({ expectedConsoleErrors: [/status of 500/] });

  for (const [variant, body, status] of [
    ["500 internal_error", { error: { code: "internal_error" } }, 500],
    ["invalid answer", { plans: "nothing" }, 200],
  ] as const) {
    test(`the list cannot be loaded (${variant}) -> error banner with circle-x`, async ({ page }) => {
      await page.route("**/api/plans", (route) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
      );
      await page.goto("/");
      await expectListError(page);
    });
  }
});

async function expectListError(page: Page) {
  const banner = page.getByRole("alert");
  await expect(banner).toHaveText("The projects could not be loaded. Restart Ramifold and try again.");
  await expect(banner.locator("[data-icon]")).toHaveCount(1);
  await expect(banner.locator('[data-icon="error"]')).toHaveCount(1);
  await expect(page.getByText("Loading projects…")).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectNoAxeViolations(page);
}

test("UI-001.loading (DER-19-08): Loading projects… without axe violations", async ({ page }) => {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/plans", async (route) => {
    await released;
    await route.fallback();
  });
  await page.goto("/");
  await expect(page.getByText("Loading projects…")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectNoAxeViolations(page);
  release();
  await expect(page.getByRole("table")).toBeVisible();
});

test("UI-003.loading (DER-19-02): Loading plan… in the tree, node area empty; then root selected, all expanded", async ({
  page,
}) => {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**/api/plans/${RAG.planId}`, async (route) => {
    await released;
    await route.fallback();
  });
  await page.goto("/");
  await page.getByRole("link", { name: RAG.title }).click();

  const plan = page.getByRole("complementary", { name: "Plan" });
  await expect(plan.getByText("Loading plan…")).toBeVisible();
  await expect(page.locator("[data-icon]").filter({ visible: true })).toHaveCount(1); // only "Simulated AI"
  await expect(page.getByRole("main")).toBeEmpty();
  await expect(tree(page)).toHaveCount(0);
  await expectNoAxeViolations(page);

  release();
  await expect(plan.getByText("Loading plan…")).toHaveCount(0);
  const root = treeRow(page, `${RAG.title}, No result yet`);
  await expect(root).toHaveAttribute("aria-selected", "true");
  await expect(tree(page).locator('[aria-selected="true"]')).toHaveCount(1);
  // All nodes with children are expanded, so every node is visible.
  await expect(tree(page).getByRole("row")).toHaveCount(5);
  await expect(root).toHaveAttribute("aria-expanded", "true");
  await expect(treeRow(page, "2 Retrieval, Concept")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("main")).toBeEmpty();
});

test("UI-003.default tree rows (AC-REQ-007-01, DER-19-03): number, title, status symbol, names, arrow only with children", async ({
  page,
}) => {
  await openRag(page);

  const rows = tree(page).getByRole("row");
  await expect(rows).toHaveCount(5);
  // Accessible names in tree order: "<number> <title>, <status word>", root without number.
  const names = await rows.evaluateAll((elements) => elements.map((e) => e.getAttribute("aria-label")));
  expect(names).toEqual([
    `${RAG.title}, No result yet`,
    "1 Datenquellen und Ingestion, No result yet",
    "2 Retrieval, Concept",
    "2.1 Chunking, Fixed plan",
    `3 ${LONG_TITLE}, No result yet`,
  ]);
  const levels = await rows.evaluateAll((elements) => elements.map((e) => e.getAttribute("aria-level")));
  expect(levels).toEqual(["1", "2", "2", "3", "2"]);

  // Status symbols by shape (data-icon), each row exactly one.
  const statusIcons = await rows.evaluateAll((elements) =>
    elements.map((e) => e.querySelector(".tree-row__status [data-icon]")?.getAttribute("data-icon")),
  );
  expect(statusIcons).toEqual(["status-none", "status-none", "status-concept", "status-fixed", "status-none"]);

  // Arrow only at nodes with children.
  const arrows = await rows.evaluateAll((elements) =>
    elements.map((e) => e.querySelectorAll('[data-icon="expand"], [data-icon="collapse"]').length),
  );
  expect(arrows).toEqual([1, 0, 1, 0, 0]);
  await expect(treeRow(page, "2 Retrieval, Concept").locator('[data-icon="collapse"]')).toHaveCount(1);

  // Visible number and title; the root has no number and is bold.
  await expect(treeRow(page, "2.1 Chunking, Fixed plan")).toContainText("2.1Chunking");
  const root = treeRow(page, `${RAG.title}, No result yet`);
  await expect(root.locator(".tree-row__number")).toHaveCount(0);
  await expect(root.getByText(RAG.title)).toHaveCSS("font-weight", "700");

  // An overlong title is shortened with "…"; the name has the full title.
  const longTitle = treeRow(page, `3 ${LONG_TITLE}, No result yet`).getByText(LONG_TITLE);
  await expect(longTitle).toHaveCSS("text-overflow", "ellipsis");
  expect(await longTitle.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);

  // Symbols are no focus points of their own.
  await expect(tree(page).locator("svg[focusable='false'][aria-hidden='true']")).toHaveCount(7);
  await expectNoAxeViolations(page);
});

test("UI-003 status mark tooltip (DER-19-04): one tooltip, status word or full title, Esc hides it", async ({ page }) => {
  await openRag(page);
  const tooltip = page.getByRole("tooltip", { includeHidden: true });

  // Keyboard focus: at once, only the status word. The pointer rests in the node area, away from the tree.
  await page.mouse.move(900, 600);
  await tree(page).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const retrieval = treeRow(page, "2 Retrieval, Concept");
  await expect(retrieval).toBeFocused();
  await expect(tooltip).toHaveCount(1);
  await expect(tooltip).toHaveText("Concept");
  await expect(tooltip).toHaveAttribute("aria-hidden", "true");
  await expectNoAxeViolations(page);

  // It stays while the row has the focus.
  await page.waitForTimeout(1000);
  await expect(tooltip).toHaveText("Concept");

  // Esc hides it; the selection stays.
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await expect(retrieval).toBeFocused();
  await expect(treeRow(page, `${RAG.title}, No result yet`)).toHaveAttribute("aria-selected", "true");

  // Shortened title: "<full title> · <status word>".
  await page.keyboard.press("End");
  await expect(tooltip).toHaveText(`${LONG_TITLE} · No result yet`);
  await expect(tooltip).toHaveCount(1);

  // Pointer on another row: after the delay exactly one tooltip in the document.
  await treeRow(page, "2.1 Chunking, Fixed plan").hover();
  await expect(tooltip).toHaveText("Fixed plan");
  await expect(tooltip).toHaveCount(1);
  // Hidden after the pointer left row and tooltip: the focused row shows its tooltip again.
  await page.mouse.move(900, 600);
  await expect(tooltip).toHaveText(`${LONG_TITLE} · No result yet`);
  await expect(tooltip).toHaveCount(1);
});

test("UI-003 keyboard (DER-19-05): one tab stop, arrows, Home/End, Enter opens the node, selection with a bar", async ({
  page,
}) => {
  await openRag(page);
  const root = treeRow(page, `${RAG.title}, No result yet`);
  const retrieval = treeRow(page, "2 Retrieval, Concept");
  const chunking = treeRow(page, "2.1 Chunking, Fixed plan");

  // Header -> tree: one tab stop.
  await page.getByRole("banner").getByRole("link", { name: "Data notice" }).focus();
  await page.keyboard.press("Tab");
  await expect(root).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(tree(page).locator(":focus")).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(root).toBeFocused();

  // ↓/↑ move the focus.
  await page.keyboard.press("ArrowDown");
  await expect(treeRow(page, "1 Datenquellen und Ingestion, No result yet")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(retrieval).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowDown");
  await expect(retrieval).toBeFocused();

  // → on an expanded node goes to the first child; ← goes to the parent; ← collapses, → expands.
  await page.keyboard.press("ArrowRight");
  await expect(chunking).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(retrieval).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(retrieval).toHaveAttribute("aria-expanded", "false");
  await expect(chunking).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(retrieval).toHaveAttribute("aria-expanded", "true");
  await expect(chunking).toBeVisible();

  // Home/End.
  await page.keyboard.press("End");
  await expect(treeRow(page, `3 ${LONG_TITLE}, No result yet`)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(root).toBeFocused();

  // Enter opens (selects) the node; it is marked by color and a bar.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(retrieval).toHaveAttribute("aria-selected", "true");
  await expect(root).toHaveAttribute("aria-selected", "false");
  const bar = await retrieval.evaluate((e) => {
    const style = getComputedStyle(e, "::before");
    return { content: style.content, width: style.width };
  });
  expect(bar).toEqual({ content: '""', width: "3px" });
  await expect(root).not.toHaveCSS("background-color", await retrieval.evaluate((e) => getComputedStyle(e).backgroundColor));

  // Mouse click opens a node too.
  await chunking.click();
  await expect(chunking).toHaveAttribute("aria-selected", "true");
  await expectNoAxeViolations(page);
});

test("UI-003 header and page title (DER-19-06): breadcrumbs with one separator, Data notice, Simulated AI", async ({
  page,
  project,
}) => {
  await openRag(page);
  await expect(page).toHaveTitle(`${RAG.title} – ${path.basename(project.dir)} – Ramifold`);

  const header = page.getByRole("banner");
  const breadcrumb = header.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toHaveText(`Projects${RAG.title}`);
  await expect(header.locator('[data-icon="breadcrumb-separator"]')).toHaveCount(1);
  const separator = breadcrumb.locator('[data-icon="breadcrumb-separator"]');
  await expect(separator).toHaveAttribute("aria-hidden", "true");
  const mutedColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--text-muted)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(separator).toHaveCSS("color", mutedColor);
  await expect(header.getByRole("link", { name: "Data notice" })).toBeVisible();
  await expect(header.getByText("Simulated AI")).toBeVisible();
  await expect(header.locator('[data-icon="simulated-ai"]')).toHaveCount(1);
  await expectNoAxeViolations(page);

  // "Projects" leads to UI-001.
  await breadcrumb.getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(header.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
});

test.describe("UI-003 page title with a long plan title (DER-19-06)", () => {
  const longPlan = { planId: "01JDQ7Z8M3A6Y2W4X5V7T9R3P3", root: "01JDQ7Z8M3A6Y2W4X5V7T9R3C0" };
  const title = "Migration des Billing-Service auf ereignisgesteuerte Verarbeitung";

  test("shortens the plan title over 40 characters with …", async ({ page, project }) => {
    await writeSeedPlan(project.dir, {
      planId: longPlan.planId,
      createdAt: "2026-11-20T08:00:00.000Z",
      nodes: [{ id: longPlan.root, parentId: null, title }],
    });
    await page.goto(`/plans/${longPlan.planId}`);
    await expect(tree(page).getByRole("row")).toHaveCount(1);
    await expect(page).toHaveTitle(`${[...title].slice(0, 39).join("")}… – ${path.basename(project.dir)} – Ramifold`);
  });
});

test.describe("UI-003 below 1024 px (DER-19-07)", () => {
  test.use({ viewport: { width: 1000, height: 800 } });

  test("the plan column is an expandable area, initially open; the state stays when the node changes", async ({ page }) => {
    await openRag(page);
    const toggle = page.getByRole("button", { name: "Hide plan" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle.locator('[data-icon="collapse"]')).toHaveCount(1);
    await expect(toggle).toHaveAttribute("aria-controls", "plan-column");
    await expect(tree(page)).toBeVisible();
    // Above the single-column node area.
    const treeBox = (await tree(page).boundingBox())!;
    const mainBox = (await page.getByRole("main").boundingBox())!;
    expect(treeBox.y + treeBox.height).toBeLessThanOrEqual(mainBox.y + 0.5);
    await expectNoAxeViolations(page);

    // Changing the node keeps the state.
    await treeRow(page, "2 Retrieval, Concept").click();
    await expect(treeRow(page, "2 Retrieval, Concept")).toHaveAttribute("aria-selected", "true");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    await toggle.click();
    const show = page.getByRole("button", { name: "Show plan" });
    await expect(show).toHaveAttribute("aria-expanded", "false");
    await expect(show.locator('[data-icon="expand"]')).toHaveCount(1);
    await expect(show).toBeFocused();
    await expect(tree(page)).toBeHidden();
    // Not in the tab order: Tab from the button does not reach the tree.
    await page.keyboard.press("Tab");
    await expect(tree(page).locator(":focus")).toHaveCount(0);
    await expectNoAxeViolations(page);

    await show.click();
    await expect(page.getByRole("button", { name: "Hide plan" })).toHaveAttribute("aria-expanded", "true");
    await expect(treeRow(page, "2 Retrieval, Concept")).toHaveAttribute("aria-selected", "true");
  });

  test("at 1280 px there is no button and the tree is always visible", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await openRag(page);
    await page.getByRole("button", { name: "Hide plan" }).click();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole("button", { name: /plan/ })).toHaveCount(0);
    await expect(tree(page)).toBeVisible();
  });
});
