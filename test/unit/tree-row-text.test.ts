import { describe, expect, it } from "vitest";
import { STATUS_WORD, treeRowName, treeRowTooltipText } from "../../src/web/screens/workspace/tree-row-text";

// TechSpec 2.16 "Baumzeile" and "Tooltip der Baumzeile" (Design v0.4.2, X2 (3), DL-02).

const row = { number: "2.2", title: "Embedding-Modell", resultStatus: "concept" as const };

describe("treeRowName", () => {
  it("is '<number> <title>, <status word>' for a node without marks", () => {
    expect(treeRowName(row)).toBe("2.2 Embedding-Modell, Concept");
  });

  it("has no number for the root", () => {
    expect(treeRowName({ number: null, title: "Eigenes produktives RAG", resultStatus: "open" })).toBe(
      "Eigenes produktives RAG, No result yet",
    );
  });

  it("uses the status words No result yet, Concept and Fixed plan", () => {
    expect(STATUS_WORD).toEqual({ open: "No result yet", concept: "Concept", fixed: "Fixed plan" });
    expect(treeRowName({ ...row, resultStatus: "fixed" })).toBe("2.2 Embedding-Modell, Fixed plan");
  });

  it.each([
    [{ draft: true }, "2.2 Embedding-Modell, Concept, Draft"],
    [{ hiddenCount: 3 }, "2.2 Embedding-Modell, Concept, +3"],
    [{ aiRunning: true }, "2.2 Embedding-Modell, Concept, AI running"],
    [{ draft: true, hiddenCount: 3 }, "2.2 Embedding-Modell, Concept, Draft, +3"],
    [{ draft: true, aiRunning: true }, "2.2 Embedding-Modell, Concept, Draft, AI running"],
    [{ hiddenCount: 3, aiRunning: true }, "2.2 Embedding-Modell, Concept, +3, AI running"],
    [{ draft: true, hiddenCount: 3, aiRunning: true }, "2.2 Embedding-Modell, Concept, Draft, +3, AI running"],
    [{ draft: false, hiddenCount: 0, aiRunning: false }, "2.2 Embedding-Modell, Concept"],
  ])("adds the visible marks %o in the fixed order", (marks, expected) => {
    expect(treeRowName({ ...row, ...marks })).toBe(expected);
  });

  it("keeps the root without number with marks: '<title>, <status word>, +n'", () => {
    expect(treeRowName({ number: null, title: "Eigenes produktives RAG", resultStatus: "concept", hiddenCount: 24 })).toBe(
      "Eigenes produktives RAG, Concept, +24",
    );
  });

  it("always has the full title, also when it is visibly shortened", () => {
    const title = "Ein sehr langer Titel ".repeat(9).trim();
    expect(treeRowName({ number: "1", title, resultStatus: "open" })).toBe(`1 ${title}, No result yet`);
  });
});

describe("treeRowTooltipText", () => {
  it("is only the status word when the title is not shortened", () => {
    expect(treeRowTooltipText("Embedding-Modell", "Concept", false)).toBe("Concept");
  });

  it("is '<full title> · <status word>' when the title is shortened", () => {
    expect(treeRowTooltipText("Embedding-Modell", "Concept", true)).toBe("Embedding-Modell · Concept");
  });
});
