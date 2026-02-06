import type { BoundingBox, MeasurementResult, VisualCenter } from "../types";

function drawCropped(
  img: HTMLImageElement,
  contentBox: BoundingBox,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = contentBox.width;
  canvas.height = contentBox.height;

  ctx.drawImage(
    img,
    contentBox.x,
    contentBox.y,
    contentBox.width,
    contentBox.height,
    0,
    0,
    contentBox.width,
    contentBox.height,
  );

  return canvas;
}

export function cropToDataUrl(
  img: HTMLImageElement,
  contentBox: BoundingBox,
): string {
  const canvas = drawCropped(img, contentBox);
  if (!canvas) return img.src;
  return canvas.toDataURL("image/png");
}

export function cropToBlobUrl(
  img: HTMLImageElement,
  contentBox: BoundingBox,
): Promise<string> {
  const canvas = drawCropped(img, contentBox);
  if (!canvas) return Promise.resolve(img.src);
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

let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

function getReusableContext(
  w: number,
  h: number,
): CanvasRenderingContext2D | null {
  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _ctx = _canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!_ctx) return null;
  _canvas.width = w;
  _canvas.height = h;
  return _ctx;
}

const INV_255 = 1 / 255;

export function measureWithContentDetection(
  img: HTMLImageElement,
  contrastThreshold: number = 10,
  includeDensity: boolean = false,
): MeasurementResult {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const ctx = getReusableContext(w, h);

  if (!ctx) {
    return { width: w, height: h };
  }

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const thresh = contrastThreshold;
  const bgR = 255;
  const bgG = 255;
  const bgB = 255;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  let filledPixels = 0;
  let totalWeightedOpacity = 0;

  for (let y = 0; y < h; y++) {
    const rowOffset = (y * w) << 2;
    for (let x = 0; x < w; x++) {
      const i = rowOffset + (x << 2);

      const a = data[i + 3]!;
      if (a <= thresh) continue;

      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      const dr = r - bgR;
      const dg = g - bgG;
      const db = b - bgB;

      if (
        dr > -thresh &&
        dr < thresh &&
        dg > -thresh &&
        dg < thresh &&
        db > -thresh &&
        db < thresh
      )
        continue;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const distSq = dr * dr + dg * dg + db * db;
      const aScaled = a * INV_255;
      const weight = distSq ** 0.25 * aScaled;

      totalWeight += weight;
      weightedX += (x + 0.5) * weight;
      weightedY += (y + 0.5) * weight;

      filledPixels++;
      totalWeightedOpacity += aScaled;
    }
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

  const contentBox: BoundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  let visualCenter: VisualCenter;

  if (totalWeight === 0) {
    const centerX = contentBox.x + contentBox.width / 2;
    const centerY = contentBox.y + contentBox.height / 2;
    visualCenter = { x: centerX, y: centerY, offsetX: 0, offsetY: 0 };
  } else {
    const globalCenterX = weightedX / totalWeight;
    const globalCenterY = weightedY / totalWeight;

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
    const totalPixels = contentBox.width * contentBox.height;
    if (totalPixels === 0) {
      result.pixelDensity = 0.5;
    } else {
      const coverageRatio = filledPixels / totalPixels;
      const averageOpacity =
        filledPixels > 0 ? totalWeightedOpacity / filledPixels : 0;
      result.pixelDensity = coverageRatio * averageOpacity;
    }
  }

  return result;
}
