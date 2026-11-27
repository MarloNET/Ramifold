import { describe, expect, it } from "vitest";
import { shortenPlanTitle } from "../../src/web/app/page-title";
import { messages } from "../../src/web/text/messages";

// Page title of the workspace (TechSpec 2.2, A-UX-16, CC-13): plan title over 40 code points shortened to 39 + "…".

describe("page title of UI-003", () => {
  it("keeps a title of up to 40 code points", () => {
    const forty = "x".repeat(40);
    expect(shortenPlanTitle(forty)).toBe(forty);
  });

  it("shortens a title over 40 code points to 39 code points and …", () => {
    expect(shortenPlanTitle("y".repeat(41))).toBe(`${"y".repeat(39)}…`);
    // Code points, not UTF-16 units.
    expect(shortenPlanTitle("🌳".repeat(41))).toBe(`${"🌳".repeat(39)}…`);
  });

  it("is '<plan title> – <folder name> – Ramifold'", () => {
    expect(messages["UI-003.pageTitle"]("Eigenes produktives RAG", "billing-service")).toBe(
      "Eigenes produktives RAG – billing-service – Ramifold",
    );
  });
});
