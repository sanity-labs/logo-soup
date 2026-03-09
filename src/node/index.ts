import { createCanvas, loadImage as loadNativeImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { measureContent } from "../core/measure-pixels";
import type { MeasurementResult } from "../core/types";

export type {
  AlignmentMode,
  BoundingBox,
  LogoSource,
  MeasurementResult,
  NormalizedLogo,
  VisualCenter,
} from "../core/types";
export {
  calculateNormalizedDimensions,
  createNormalizedLogo,
} from "../core/normalize";
export { getVisualCenterTransform } from "../core/get-visual-center-transform";

export type MeasureOptions = {
  contrastThreshold?: number;
  densityAware?: boolean;
  backgroundColor?: [number, number, number];
};

/**
 * Measure a single image and return its content detection results.
 * Accepts a file path, URL, or Buffer.
 */
export async function measureImage(
  source: string | Buffer,
  options: MeasureOptions = {},
): Promise<MeasurementResult> {
  const { contrastThreshold, densityAware = true, backgroundColor } = options;

  const input =
    typeof source === "string" && !source.startsWith("http")
      ? await readFile(source)
      : source;

  const img = await loadNativeImage(input);
  const w = img.width;
  const h = img.height;

  return (
    measureContent(
      (sw, sh) => createCanvas(sw, sh).getContext("2d"),
      img,
      w,
      h,
      { contrastThreshold, includeDensity: densityAware, backgroundColor },
    ) ?? { width: w, height: h }
  );
}

/**
 * Measure multiple images in parallel.
 * Returns results in the same order as the input array.
 */
export async function measureImages(
  sources: (string | Buffer)[],
  options: MeasureOptions = {},
): Promise<MeasurementResult[]> {
  return Promise.all(sources.map((source) => measureImage(source, options)));
}
