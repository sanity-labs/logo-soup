import { DEFAULT_ALIGN_BY } from "./constants";
import type { AlignmentMode, NormalizedLogo } from "./types";

export function getVisualCenterTransform(
  logo: NormalizedLogo,
  alignBy: AlignmentMode = DEFAULT_ALIGN_BY,
): string | undefined {
  if (alignBy === "bounds" || !logo.visualCenter) {
    return undefined;
  }

  const scaleX =
    logo.normalizedWidth / (logo.contentBox?.width || logo.originalWidth);
  const scaleY =
    logo.normalizedHeight / (logo.contentBox?.height || logo.originalHeight);

  const offsetX =
    alignBy === "visual-center" || alignBy === "visual-center-x"
      ? -logo.visualCenter.offsetX * scaleX
      : 0;
  const offsetY =
    alignBy === "visual-center" || alignBy === "visual-center-y"
      ? -logo.visualCenter.offsetY * scaleY
      : 0;

  if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
    const rx = Math.round(offsetX * 10) / 10;
    const ry = Math.round(offsetY * 10) / 10;
    return `translate(${rx}px, ${ry}px)`;
  }

  return undefined;
}
