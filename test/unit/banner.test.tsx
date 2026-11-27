import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Banner, BANNER_ICON } from "../../src/web/components/Banner";

// TechSpec 2.16 "Banner" (Design v0.4.4, DL-04): the symbol depends only on the variant, success has none.

describe("Banner", () => {
  it("BANNER_ICON: error -> error, warn -> warning, info -> info, success -> null", () => {
    expect(BANNER_ICON).toEqual({ error: "error", warn: "warning", info: "info", success: null });
  });

  it("a success banner renders no element with data-icon", () => {
    const html = renderToStaticMarkup(<Banner variant="success">Exported</Banner>);
    expect(html).not.toContain("data-icon");
    expect(html).toContain('role="status"');
  });

  it.each([
    ["error", "error", "alert"],
    ["warn", "warning", "alert"],
    ["info", "info", "status"],
  ] as const)("a %s banner shows the symbol %s and has role %s", (variant, icon, role) => {
    const html = renderToStaticMarkup(<Banner variant={variant}>Text</Banner>);
    expect(html.match(/data-icon="([^"]+)"/g)).toEqual([`data-icon="${icon}"`]);
    expect(html).toContain(`role="${role}"`);
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain("Text");
  });
});
