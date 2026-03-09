import type { BoundingBox, MeasurementResult, VisualCenter } from "./types";

/** Minimal subset of CanvasRenderingContext2D used for measurement */
export type MeasureContext = {
  drawImage(
    source: unknown,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): { data: Uint8ClampedArray };
};

export type MeasureContentOptions = {
  contrastThreshold?: number;
  includeDensity?: boolean;
  backgroundColor?: [number, number, number];
};

/**
 * Shared measurement pipeline used by both browser and Node adapters.
 *
 * The caller provides a `getContext` factory that returns a canvas context
 * sized to `(sw, sh)`. This keeps all canvas creation environment-specific
 * while the downsample -> pixel extract -> scan pipeline stays in one place.
 *
 * Returns `null` if `getContext` returns `null` (e.g. browser canvas failure).
 */
export function measureContent(
  getContext: (sw: number, sh: number) => MeasureContext | null,
  image: unknown,
  width: number,
  height: number,
  options: MeasureContentOptions = {},
): MeasurementResult | null {
  const {
    contrastThreshold = 10,
    includeDensity = false,
    backgroundColor,
  } = options;

  const { sw, sh } = downsampleDimensions(width, height);
  const ctx = getContext(sw, sh);
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, sw, sh);

  const imageData = ctx.getImageData(0, 0, sw, sh);
  const data32 = new Uint32Array(imageData.data.buffer);

  return scanPixels({
    width,
    height,
    data32,
    sw,
    sh,
    contrastThreshold,
    includeDensity,
    backgroundColor,
  });
}

export type PerimeterAnalysis = {
  transparent: boolean;
  bgR: number;
  bgG: number;
  bgB: number;
};

const SHIFT = 5;
const LEVELS = 1 << (8 - SHIFT);
const BUCKET_COUNT = LEVELS * LEVELS * LEVELS;

const _bucketCounts = new Uint16Array(BUCKET_COUNT);
const _bucketR = new Uint32Array(BUCKET_COUNT);
const _bucketG = new Uint32Array(BUCKET_COUNT);
const _bucketB = new Uint32Array(BUCKET_COUNT);

export function analyzePerimeter(
  data32: Uint32Array,
  sw: number,
  sh: number,
): PerimeterAnalysis {
  _bucketCounts.fill(0);
  _bucketR.fill(0);
  _bucketG.fill(0);
  _bucketB.fill(0);

  let opaqueCount = 0;
  let transparentCount = 0;

  const lastRow = (sh - 1) * sw;
  const lastCol = sw - 1;

  for (let x = 0; x < sw; x++) {
    samplePixel(data32[x]!);
    if (sh > 1) samplePixel(data32[lastRow + x]!);
  }
  for (let y = 1; y < sh - 1; y++) {
    const row = y * sw;
    samplePixel(data32[row]!);
    if (sw > 1) samplePixel(data32[row + lastCol]!);
  }

  function samplePixel(pixel: number) {
    const a = pixel >>> 24;
    if (a < 128) {
      transparentCount++;
      return;
    }
    opaqueCount++;
    const r = pixel & 0xff;
    const g = (pixel >>> 8) & 0xff;
    const b = (pixel >>> 16) & 0xff;
    const key =
      ((r >>> SHIFT) * LEVELS + (g >>> SHIFT)) * LEVELS + (b >>> SHIFT);
    _bucketCounts[key]!++;
    _bucketR[key]! += r;
    _bucketG[key]! += g;
    _bucketB[key]! += b;
  }

  const totalPerimeter = opaqueCount + transparentCount;
  const transparent =
    totalPerimeter > 0 && transparentCount > totalPerimeter * 0.1;

  let bestCount = 0;
  let bestIdx = 0;
  for (let i = 0; i < BUCKET_COUNT; i++) {
    if (_bucketCounts[i]! > bestCount) {
      bestCount = _bucketCounts[i]!;
      bestIdx = i;
    }
  }

  const bgR = bestCount ? Math.round(_bucketR[bestIdx]! / bestCount) : 255;
  const bgG = bestCount ? Math.round(_bucketG[bestIdx]! / bestCount) : 255;
  const bgB = bestCount ? Math.round(_bucketB[bestIdx]! / bestCount) : 255;

  return { transparent, bgR, bgG, bgB };
}

export type ContentScanOptions = {
  /** Original image width in pixels */
  width: number;
  /** Original image height in pixels */
  height: number;
  /** Downsampled pixel data as Uint32Array (little-endian RGBA) */
  data32: Uint32Array;
  /** Width of the downsampled image */
  sw: number;
  /** Height of the downsampled image */
  sh: number;
  contrastThreshold: number;
  includeDensity: boolean;
  backgroundColor?: [number, number, number];
};

/**
 * Pure pixel math: single-pass content scan over a Uint32Array.
 * Computes bounding box, visual center, density, and background luminance.
 * No canvas or DOM dependencies.
 */
export function scanPixels(options: ContentScanOptions): MeasurementResult {
  const {
    width: w,
    height: h,
    data32,
    sw,
    sh,
    contrastThreshold,
    includeDensity,
    backgroundColor,
  } = options;

  const scaleX = w / sw;
  const scaleY = h / sh;

  const contrastDistanceSq = contrastThreshold * contrastThreshold * 3;

  let bgR: number;
  let bgG: number;
  let bgB: number;
  let alphaOnly: boolean;

  if (backgroundColor) {
    bgR = backgroundColor[0];
    bgG = backgroundColor[1];
    bgB = backgroundColor[2];
    alphaOnly = false;
  } else {
    const perimeter = analyzePerimeter(data32, sw, sh);
    if (perimeter.transparent) {
      alphaOnly = true;
      bgR = 0;
      bgG = 0;
      bgB = 0;
    } else {
      alphaOnly = false;
      bgR = perimeter.bgR;
      bgG = perimeter.bgG;
      bgB = perimeter.bgB;
    }
  }

  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  let filledPixels = 0;
  let totalWeightedOpacity = 0;

  const pixelCount = sw * sh;
  for (let i = 0; i < pixelCount; i++) {
    const pixel = data32[i]!;

    const a = pixel >>> 24;
    if (a <= contrastThreshold) continue;

    let weight: number;
    let opacity: number;

    if (alphaOnly) {
      weight = a * a;
      opacity = a;
    } else {
      const r = pixel & 0xff;
      const g = (pixel >>> 8) & 0xff;
      const b = (pixel >>> 16) & 0xff;

      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;

      const distSq = dr * dr + dg * dg + db * db;
      if (distSq < contrastDistanceSq) continue;

      weight = distSq * a;
      opacity = Math.min(a, Math.sqrt(distSq));
    }

    const x = i % sw;
    const y = (i - x) / sw;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    totalWeight += weight;
    weightedX += (x + 0.5) * weight;
    weightedY += (y + 0.5) * weight;

    filledPixels++;
    totalWeightedOpacity += opacity;
  }

  if (minX > maxX || minY > maxY) {
    return {
      width: w,
      height: h,
      contentBox: { x: 0, y: 0, width: w, height: h },
      visualCenter: { x: w / 2, y: h / 2, offsetX: 0, offsetY: 0 },
      pixelDensity: includeDensity ? 0.5 : undefined,
    };
  }

  const cbX = Math.floor(minX * scaleX);
  const cbY = Math.floor(minY * scaleY);
  const contentBox: BoundingBox = {
    x: cbX,
    y: cbY,
    width: Math.min(Math.ceil((maxX + 1) * scaleX), w) - cbX,
    height: Math.min(Math.ceil((maxY + 1) * scaleY), h) - cbY,
  };

  let visualCenter: VisualCenter;

  if (totalWeight === 0) {
    const centerX = contentBox.x + contentBox.width / 2;
    const centerY = contentBox.y + contentBox.height / 2;
    visualCenter = { x: centerX, y: centerY, offsetX: 0, offsetY: 0 };
  } else {
    const globalCenterX = (weightedX / totalWeight) * scaleX;
    const globalCenterY = (weightedY / totalWeight) * scaleY;

    const localCenterX = globalCenterX - contentBox.x;
    const localCenterY = globalCenterY - contentBox.y;

    visualCenter = {
      x: globalCenterX,
      y: globalCenterY,
      offsetX: localCenterX - contentBox.width / 2,
      offsetY: localCenterY - contentBox.height / 2,
    };
  }

  const result: MeasurementResult = {
    width: w,
    height: h,
    contentBox,
    visualCenter,
  };

  if (!alphaOnly) {
    result.backgroundLuminance = (bgR * 299 + bgG * 587 + bgB * 114) / 255000;
  }

  if (includeDensity) {
    const scanArea = (maxX - minX + 1) * (maxY - minY + 1);
    if (scanArea === 0) {
      result.pixelDensity = 0.5;
    } else {
      const coverageRatio = filledPixels / scanArea;
      const averageOpacity =
        filledPixels > 0 ? totalWeightedOpacity / 255 / filledPixels : 0;
      result.pixelDensity = coverageRatio * averageOpacity;
    }
  }

  return result;
}

const PIXEL_BUDGET = 2_048;

/** Compute downsampled dimensions for a given image size */
export function downsampleDimensions(
  w: number,
  h: number,
): { sw: number; sh: number } {
  const totalPixels = w * h;
  const ratio =
    totalPixels > PIXEL_BUDGET ? Math.sqrt(PIXEL_BUDGET / totalPixels) : 1;
  return {
    sw: Math.max(1, Math.round(w * ratio)),
    sh: Math.max(1, Math.round(h * ratio)),
  };
}
