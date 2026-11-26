import { describe, expect, it } from "vitest";
import { hostRejectionPage } from "../../src/server/http/host-rejection-page";

describe("hostRejectionPage (MSG-014)", () => {
  const html = hostRejectionPage();

  it("has the title and the one paragraph from the design", () => {
    expect(html).toContain("<title>Address not allowed</title>");
    expect(html.match(/<p>/g)).toHaveLength(1);
    expect(html).toContain("<p>This address is not allowed. Open the address shown in the terminal.</p>");
  });

  it("contains no script, no stylesheet and no data", () => {
    expect(html).not.toMatch(/<script|<link|<style|style=|<img|<form/i);
  });
});
