import fsp from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Contrast pairs of docs/ux/DESIGN.md ("Gemessene Kontraste") and TechSpec 2.16, checked with the WCAG formula
// against the values in tokens.css. Text needs 4.5:1; symbols, borders and focus ring 3:1.

const TEXT = 4.5;
const NON_TEXT = 3;

const PAIRS: Array<[foreground: string, background: string, minimum: number]> = [
  // DESIGN.md
  ["text", "bg", TEXT],
  ["text-muted", "bg", TEXT],
  ["text-muted", "tree-bg", TEXT],
  ["on-primary", "primary", TEXT],
  ["primary", "bg", TEXT],
  ["border", "bg", NON_TEXT],
  ["tree-sel-text", "tree-sel-bg", TEXT],
  ["status-concept", "tree-bg", NON_TEXT],
  ["status-fixed", "tree-bg", NON_TEXT],
  ["status-none", "tree-bg", NON_TEXT],
  ["none-text", "none-bg", TEXT],
  ["concept-text", "concept-bg", TEXT],
  ["fixed-text", "fixed-bg", TEXT],
  ["info-text", "info-bg", TEXT],
  ["error-text", "error-bg", TEXT],
  ["warning-text", "warning-bg", TEXT],
  ["success-text", "success-bg", TEXT],
  ["focus", "bg", NON_TEXT],
  ["text", "you-bg", TEXT],
  // TechSpec 2.16: focus ring on all surfaces, status symbols on the selected row
  ["focus", "surface", NON_TEXT],
  ["focus", "tree-bg", NON_TEXT],
  ["focus", "tree-sel-bg", NON_TEXT],
  ["status-concept", "tree-sel-bg", NON_TEXT],
  ["status-fixed", "tree-sel-bg", NON_TEXT],
  ["status-none", "tree-sel-bg", NON_TEXT],
  // TechSpec 2.16: symbol colors
  ["tree-muted", "tree-sel-bg", NON_TEXT],
  ["tree-muted", "tree-bg", NON_TEXT],
  ["text-muted", "surface", NON_TEXT],
  ["info", "header-bg", NON_TEXT],
  ["status-concept", "bg", NON_TEXT],
  ["error", "bg", NON_TEXT],
  ["info", "bg", NON_TEXT],
  // Marks: "Simulated AI" text in info on info-bg
  ["info", "info-bg", TEXT],
];

async function readTokens(): Promise<Record<string, string>> {
  const css = await fsp.readFile(path.resolve(import.meta.dirname, "../../src/web/styles/tokens.css"), "utf8");
  const tokens: Record<string, string> = {};
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[match[1]!] = match[2]!;
  return tokens;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("tokens.css", () => {
  it("has the values of DESIGN.md for the main colors", async () => {
    const t = await readTokens();
    expect(t).toMatchObject({
      bg: "#ffffff",
      text: "#17202a",
      "text-muted": "#4a5561",
      primary: "#0b6073",
      focus: "#0b57d0",
      "tree-sel-bg": "#d5e7ea",
      error: "#b42318",
    });
  });

  it.each(PAIRS)("%s on %s reaches %s:1", async (fg, bg, minimum) => {
    const t = await readTokens();
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(minimum);
  });

  it("computes the WCAG ratio like the reference values (text/bg 16.5, focus/tree-sel-bg 5.0)", async () => {
    const t = await readTokens();
    expect(contrast(t.text!, t.bg!)).toBeCloseTo(16.5, 0);
    expect(contrast(t.focus!, t["tree-sel-bg"]!)).toBeCloseTo(5.0, 0);
  });
});
