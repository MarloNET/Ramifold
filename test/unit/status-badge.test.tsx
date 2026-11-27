import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge, STATUS_BADGE_ICON } from "../../src/web/components/StatusBadge";

// TechSpec 2.16 "Pillen und Marken": symbol and colors depend only on the kind.

describe("StatusBadge", () => {
  it("marks at messages: not_sent, incomplete, not_saved -> error, aborted -> aborted", () => {
    expect(STATUS_BADGE_ICON).toMatchObject({
      not_sent: "error",
      incomplete: "error",
      not_saved: "error",
      aborted: "aborted",
    });
  });

  it("status pills: open -> status-none, concept -> status-concept, fixed -> status-fixed", () => {
    expect(STATUS_BADGE_ICON).toMatchObject({ open: "status-none", concept: "status-concept", fixed: "status-fixed" });
  });

  it.each([
    ["not_sent", "error", "not sent"],
    ["incomplete", "error", "incomplete"],
    ["not_saved", "error", "not saved"],
    ["aborted", "aborted", "aborted"],
    ["open", "status-none", "No result yet"],
    ["concept", "status-concept", "Concept"],
    ["fixed", "status-fixed", "Fixed plan"],
  ] as const)("%s renders the symbol %s and the text %s", (kind, icon, text) => {
    const html = renderToStaticMarkup(<StatusBadge kind={kind} />);
    expect(html.match(/data-icon="([^"]+)"/g)).toEqual([`data-icon="${icon}"`]);
    expect(html).toContain(`data-kind="${kind}"`);
    expect(html).toContain(text);
  });
});
