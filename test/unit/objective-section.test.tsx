import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ObjectiveSection } from "../../src/web/screens/workspace/ObjectiveSection";

// ObjectiveSection shows the objective it gets (TechSpec 4.3; content from NodeDetailDto with task #78, MAR-1516).

describe("ObjectiveSection", () => {
  it("shows the heading Objective and the given objective", () => {
    const html = renderToStaticMarkup(<ObjectiveSection objective="Produktives RAG für interne Dokumente planen" />);
    expect(html).toContain("Objective");
    expect(html).toContain("Produktives RAG für interne Dokumente planen");
  });
});
