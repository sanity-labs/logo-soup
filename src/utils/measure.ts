import type { BoundingBox, MeasurementResult, VisualCenter } from "../types";

function createReusableCanvas(
  options?: CanvasRenderingContext2DSettings,
): (w: number, h: number) => CanvasRenderingContext2D | null {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let prevW = 0;
  let prevH = 0;

  return (w: number, h: number) => {
    if (!canvas) {
      canvas = document.createElement("canvas");
      ctx = canvas.getContext("2d", options);
    }
    if (!ctx) return null;
    if (prevW !== w || prevH !== h) {
      canvas.width = w;
      canvas.height = h;
      prevW = w;
      prevH = h;
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    return ctx;
  };
}

const getCropContext = createReusableCanvas();
const getMeasureContext = createReusableCanvas({ willReadFrequently: true });

function drawCropped(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: BoundingBox,
): void {
  ctx.drawImage(
    img,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height,
  );
}

export function cropToDataUrl(
  img: HTMLImageElement,
  contentBox: BoundingBox,
): string {
  const ctx = getCropContext(contentBox.width, contentBox.height);
  if (!ctx) return img.src;
  drawCropped(ctx, img, contentBox);
  return ctx.canvas.toDataURL("image/png");
}

export function cropToBlobUrl(
  img: HTMLImageElement,
  contentBox: BoundingBox,
): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(img.src);

  canvas.width = contentBox.width;
  canvas.height = contentBox.height;
  drawCropped(ctx, img, contentBox);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(img.src);
        return;
      }
      resolve(URL.createObjectURL(blob));
    });
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function measureImage(img: HTMLImageElement): MeasurementResult {
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

interface PerimeterAnalysis {
  transparent: boolean;
  bgR: number;
  bgG: number;
  bgB: number;
}

export function analyzePerimeter(
  data32: Uint32Array,
  sw: number,
  sh: number,
): PerimeterAnalysis {
  const SHIFT = 5;
  const LEVELS = 1 << (8 - SHIFT);
  const buckets = new Map<
    number,
    { r: number; g: number; b: number; count: number }
  >();

  let opaqueCount = 0;
  let transparentCount = 0;

  function sample(i: number) {
    const pixel = data32[i]!;
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
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  for (let x = 0; x < sw; x++) {
    sample(x);
    if (sh > 1) sample((sh - 1) * sw + x);
  }
  for (let y = 1; y < sh - 1; y++) {
    sample(y * sw);
    if (sw > 1) sample(y * sw + sw - 1);
  }

  const totalPerimeter = opaqueCount + transparentCount;
  const transparent =
    totalPerimeter > 0 && transparentCount > totalPerimeter * 0.1;

  let bestBucket: { r: number; g: number; b: number; count: number } | null =
    null;
  for (const bucket of buckets.values()) {
    if (!bestBucket || bucket.count > bestBucket.count) {
      bestBucket = bucket;
    }
  }

  const bgR = bestBucket ? Math.round(bestBucket.r / bestBucket.count) : 255;
  const bgG = bestBucket ? Math.round(bestBucket.g / bestBucket.count) : 255;
  const bgB = bestBucket ? Math.round(bestBucket.b / bestBucket.count) : 255;

  return { transparent, bgR, bgG, bgB };
}

const PIXEL_BUDGET = 2_048;

export function measureWithContentDetection(
  img: HTMLImageElement,
  contrastThreshold: number = 10,
  includeDensity: boolean = false,
  backgroundColor?: [number, number, number],
): MeasurementResult {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const totalPixels = w * h;
  const ratio =
    totalPixels > PIXEL_BUDGET ? Math.sqrt(PIXEL_BUDGET / totalPixels) : 1;
  const sw = Math.max(1, Math.round(w * ratio));
  const sh = Math.max(1, Math.round(h * ratio));
  const scaleX = w / sw;
  const scaleY = h / sh;

  const ctx = getMeasureContext(sw, sh);

  if (!ctx) {
    return { width: w, height: h };
  }

  ctx.drawImage(img, 0, 0, sw, sh);

  const imageData = ctx.getImageData(0, 0, sw, sh);
  const data32 = new Uint32Array(imageData.data.buffer);

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

    if (alphaOnly) {
      weight = a * a;
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
    totalWeightedOpacity += a;
  }

  if (minX > maxX || minY > maxY) {
    return {
      width: w,
      height: h,
      contentBox: { x: 0, y: 0, width: w, height: h },
      visualCenter: {
        x: w / 2,
        y: h / 2,
        offsetX: 0,
        offsetY: 0,
      },
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

    const geometricCenterX = contentBox.width / 2;
    const geometricCenterY = contentBox.height / 2;

    visualCenter = {
      x: globalCenterX,
      y: globalCenterY,
      offsetX: localCenterX - geometricCenterX,
      offsetY: localCenterY - geometricCenterY,
    };
  }

  const result: MeasurementResult = {
    width: w,
    height: h,
    contentBox,
    visualCenter,
  };

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
