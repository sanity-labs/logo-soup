import type { LogoSource, MeasurementResult, NormalizedLogo } from "../types";

export function logosEqual(
  a: (string | LogoSource)[],
  b: (string | LogoSource)[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (itemA === undefined || itemB === undefined) return false;
    const srcA = typeof itemA === "string" ? itemA : itemA.src;
    const srcB = typeof itemB === "string" ? itemB : itemB.src;
    if (srcA !== srcB) return false;
  }
  return true;
}

export function normalizeSource(source: string | LogoSource): LogoSource {
  if (typeof source === "string") {
    return { src: source, alt: "" };
  }
  return source;
}

export function calculateNormalizedDimensions(
  measurement: MeasurementResult,
  baseSize: number,
  scaleFactor: number,
  densityFactor: number = 0,
): { width: number; height: number } {
  const contentWidth = measurement.contentBox
    ? measurement.contentBox.width
    : measurement.width;
  const contentHeight = measurement.contentBox
    ? measurement.contentBox.height
    : measurement.height;

  if (contentWidth === 0 || contentHeight === 0) {
    return { width: baseSize, height: baseSize };
  }

  const aspectRatio = contentWidth / contentHeight;

  // Dan Paquette's technique:
  // normalizedWidth = (contentWidth / contentHeight) ^ scaleFactor * baseSize
  // scaleFactor of 0 = uniform widths
  // scaleFactor of 1 = uniform heights
  // scaleFactor of ~0.5 = visual balance
  let normalizedWidth = aspectRatio ** scaleFactor * baseSize;
  let normalizedHeight = normalizedWidth / aspectRatio;

  // Irradiation compensation: light content on dark backgrounds appears
  // larger/bolder due to the optical irradiation illusion. The effect is
  // more pronounced on dense/bold logos (more surface area "blooms") and
  // at higher contrast (darker backgrounds). Scale down proportionally
  // to darkness × density. Only applies to opaque images where
  // backgroundLuminance is available (transparent images are unaffected).
  //
  // References:
  // - Helmholtz irradiation illusion (1860s)
  // - https://gist.github.com/janogarcia/e9f57cd18ca85756743f81d9692764b7
  // - https://nerdy.dev/adjust-perceived-typepace-weight-for-dark-mode-without-layout-shift
  if (measurement.backgroundLuminance !== undefined) {
    const darkness = 1 - measurement.backgroundLuminance;
    const density = measurement.pixelDensity ?? 0.5;
    const irradiationScale = 1 - darkness * density * 0.08;
    normalizedWidth *= irradiationScale;
    normalizedHeight *= irradiationScale;
  }

  // Apply density compensation if available
  // Dense logos (high pixel density) get scaled down
  // Light/thin logos (low pixel density) get scaled up
  // densityFactor controls how much density affects the result (0 = no effect, 1 = full effect)
  if (densityFactor > 0 && measurement.pixelDensity !== undefined) {
    // Normalize density around 0.5 (typical density)
    // Density of 0.5 = no change
    // Density of 1.0 = scale down
    // Density of 0.0 = scale up
    const referenceDensity = 0.35;
    const densityRatio = measurement.pixelDensity / referenceDensity;

    // Apply inverse scaling: denser logos get smaller, lighter logos get larger
    // Use a dampened scale to avoid extreme adjustments
    const densityScale = (1 / densityRatio) ** (densityFactor * 0.5);

    // Clamp the scale to reasonable bounds (0.5x to 2x)
    const clampedScale = Math.max(0.5, Math.min(2, densityScale));

    normalizedWidth *= clampedScale;
    normalizedHeight *= clampedScale;
  }

  return {
    width: Math.round(normalizedWidth),
    height: Math.round(normalizedHeight),
  };
}

export function createNormalizedLogo(
  source: LogoSource,
  measurement: MeasurementResult,
  baseSize: number,
  scaleFactor: number,
  densityFactor: number = 0,
): NormalizedLogo {
  const { width, height } = calculateNormalizedDimensions(
    measurement,
    baseSize,
    scaleFactor,
    densityFactor,
  );

  const contentWidth = measurement.contentBox
    ? measurement.contentBox.width
    : measurement.width;
  const contentHeight = measurement.contentBox
    ? measurement.contentBox.height
    : measurement.height;

  return {
    src: source.src,
    alt: source.alt || "",
    originalWidth: measurement.width,
    originalHeight: measurement.height,
    contentBox: measurement.contentBox,
    normalizedWidth: width,
    normalizedHeight: height,
    aspectRatio: contentHeight > 0 ? contentWidth / contentHeight : 1,
    pixelDensity: measurement.pixelDensity,
    visualCenter: measurement.visualCenter,
  };
}
