import type { BoundingBox, MeasurementResult } from "../types";
import { computeScanSize, scanPixelData } from "./scanPixels";

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

export function measureWithContentDetection(
  img: HTMLImageElement,
  contrastThreshold: number = 10,
  includeDensity: boolean = false,
): MeasurementResult {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const { sw, sh } = computeScanSize(w, h);

  const ctx = getMeasureContext(sw, sh);
  if (!ctx) {
    return { width: w, height: h };
  }

  ctx.drawImage(img, 0, 0, sw, sh);

  const imageData = ctx.getImageData(0, 0, sw, sh);
  const data32 = new Uint32Array(imageData.data.buffer);

  return scanPixelData(data32, sw, sh, w, h, contrastThreshold, includeDensity);
}
