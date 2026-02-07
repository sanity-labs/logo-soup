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

const PIXEL_BUDGET = 2_048;

export function measureWithContentDetection(
  img: HTMLImageElement,
  contrastThreshold: number = 10,
  includeDensity: boolean = false,
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

    const r = pixel & 0xff;
    const g = (pixel >>> 8) & 0xff;
    const b = (pixel >>> 16) & 0xff;

    const dr = r - 255;
    const dg = g - 255;
    const db = b - 255;

    const distSq = dr * dr + dg * dg + db * db;
    if (distSq < contrastDistanceSq) continue;

    const x = i % sw;
    const y = (i - x) / sw;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    const weight = distSq * a;

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
