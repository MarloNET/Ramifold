import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

// Banner (TechSpec 2.16, Design v0.4.4, DL-04): the variant sets colors, role and symbol; callers never choose the
// symbol. The symbol takes the text color of the banner. Error and warning banners are alerts, info and success status.

export type BannerVariant = "info" | "warn" | "error" | "success";

export const BANNER_ICON: Record<BannerVariant, IconName | null> = {
  error: "error",
  warn: "warning",
  info: "info",
  // circle-check stays "Fixed plan".
  success: null,
};

export function Banner({ variant, children }: { variant: BannerVariant; children: ReactNode }) {
  const icon = BANNER_ICON[variant];
  return (
    <div className="banner" data-variant={variant} role={variant === "error" || variant === "warn" ? "alert" : "status"}>
      {icon !== null && <Icon name={icon} />}
      <div className="banner__text">{children}</div>
    </div>
  );
}
