import fsp from "node:fs/promises";
import path from "node:path";
import * as lucide from "lucide-react";
import { describe, expect, it } from "vitest";
import { ICON_MAP } from "../../src/web/components/Icon";

// Maintained list: the 35 meanings of the icon table of docs/ux/DESIGN.md v0.4.4 with the canonical Lucide
// export of TechSpec 2.16.
const EXPECTED: Record<string, string> = {
  "status-none": "CircleDashed",
  "status-concept": "CircleDot",
  "status-fixed": "CircleCheck",
  "ai-running": "LoaderCircle",
  info: "Info",
  error: "CircleX",
  aborted: "CircleSlash",
  "simulated-ai": "FlaskConical",
  draft: "FilePen",
  "ai-sender": "Bot",
  close: "X",
  warning: "TriangleExclamationPoint",
  locked: "Lock",
  "image-link": "Image",
  rename: "TextCursorInput",
  "edit-objective": "FileText",
  "add-child": "Plus",
  "new-project": "FolderPlus",
  "move-up": "ArrowUp",
  "move-down": "ArrowDown",
  "edit-result": "Pencil",
  summarize: "Sparkles",
  suggest: "ListTree",
  accept: "Check",
  send: "Send",
  stop: "Square",
  "send-again": "Undo2",
  "check-again": "RefreshCw",
  "show-context": "Eye",
  export: "Download",
  delete: "Trash",
  "discard-draft": "FileX",
  expand: "ChevronRight",
  collapse: "ChevronDown",
  "breadcrumb-separator": "ChevronRight",
};

/** The only symbol used for two meanings, named in DESIGN.md v0.4.4 (AL-04). */
const ALLOWED_SHARED_PAIR = ["breadcrumb-separator", "expand"];

describe("ICON_MAP", () => {
  it("contains exactly the 35 meanings of the icon table", () => {
    expect(Object.keys(EXPECTED)).toHaveLength(35);
    expect(Object.keys(ICON_MAP).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(Object.entries(EXPECTED))("maps %s to Lucide %s", (meaning, exportName) => {
    const lucideIcons = lucide as unknown as Record<string, unknown>;
    expect(lucideIcons[exportName]).toBeDefined();
    expect(ICON_MAP[meaning as keyof typeof ICON_MAP]).toBe(lucideIcons[exportName]);
  });

  it("uses no Lucide symbol twice except the pair expand/breadcrumb-separator", () => {
    const byIcon = new Map<unknown, string[]>();
    for (const [meaning, icon] of Object.entries(ICON_MAP)) byIcon.set(icon, [...(byIcon.get(icon) ?? []), meaning]);
    const shared = [...byIcon.values()].filter((meanings) => meanings.length > 1).map((m) => m.sort());
    expect(shared).toEqual([ALLOWED_SHARED_PAIR]);
  });

  it("imports no alias export (TriangleAlert, Trash2) in Icon.tsx", async () => {
    const source = await fsp.readFile(path.resolve(import.meta.dirname, "../../src/web/components/Icon.tsx"), "utf8");
    expect(source).not.toMatch(/\bTriangleAlert\b|\bTrash2\b/);
  });
});
