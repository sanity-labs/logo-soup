import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createCanvas, loadImage as loadNativeImage } from "@napi-rs/canvas";
import { measureImage, measureImages } from "../src/node/index";
import { downsampleDimensions, scanPixels } from "../src/core/measure-pixels";

const LOGOS_DIR = join(import.meta.dir, "../static/logos");

describe("measureImage", () => {
  test("measures a file path and returns content detection results", async () => {
    const logoPath = join(LOGOS_DIR, "clerk.svg");
    const result = await measureImage(logoPath);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.contentBox).toBeDefined();
    expect(result.contentBox!.width).toBeGreaterThan(0);
    expect(result.contentBox!.height).toBeGreaterThan(0);
    expect(result.visualCenter).toBeDefined();
    expect(result.pixelDensity).toBeGreaterThan(0);
    expect(result.pixelDensity).toBeLessThanOrEqual(1);
  });

  test("measures a Buffer input", async () => {
    const logoPath = join(LOGOS_DIR, "clerk.svg");
    const buffer = await readFile(logoPath);
    const result = await measureImage(buffer);

    expect(result.width).toBeGreaterThan(0);
    expect(result.contentBox).toBeDefined();
    expect(result.visualCenter).toBeDefined();
  });

  test("respects densityAware: false", async () => {
    const logoPath = join(LOGOS_DIR, "clerk.svg");
    const result = await measureImage(logoPath, { densityAware: false });

    expect(result.width).toBeGreaterThan(0);
    expect(result.contentBox).toBeDefined();
    expect(result.pixelDensity).toBeUndefined();
  });

  test("respects explicit backgroundColor", async () => {
    const logoPath = join(LOGOS_DIR, "clerk.svg");
    const result = await measureImage(logoPath, {
      backgroundColor: [255, 255, 255],
    });

    expect(result.width).toBeGreaterThan(0);
    expect(result.contentBox).toBeDefined();
    expect(result.backgroundLuminance).toBeDefined();
  });

  test("produces consistent results across repeated calls", async () => {
    const logoPath = join(LOGOS_DIR, "clerk.svg");
    const a = await measureImage(logoPath);
    const b = await measureImage(logoPath);

    expect(a).toEqual(b);
  });
});

describe("measureImages", () => {
  test("measures multiple logos in parallel", async () => {
    const paths = ["clerk.svg", "cursor.svg", "expedia.svg"].map((f) =>
      join(LOGOS_DIR, f),
    );
    const results = await measureImages(paths);

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.contentBox).toBeDefined();
      expect(result.visualCenter).toBeDefined();
    }
  });

  test("returns results in input order", async () => {
    const paths = ["clerk.svg", "cursor.svg"].map((f) => join(LOGOS_DIR, f));
    const results = await measureImages(paths);

    const individual = await Promise.all(paths.map((p) => measureImage(p)));

    expect(results[0]).toEqual(individual[0]);
    expect(results[1]).toEqual(individual[1]);
  });

  test("handles empty input", async () => {
    const results = await measureImages([]);
    expect(results).toEqual([]);
  });
});

describe("parity with scanPixels", () => {
  const svgFiles = readdirSync(LOGOS_DIR)
    .filter((f) => f.endsWith(".svg"))
    .sort()
    .slice(0, 10);

  for (const file of svgFiles) {
    test(`${file} matches direct scanPixels call`, async () => {
      const buf = Buffer.from(await readFile(join(LOGOS_DIR, file)));

      // Rasterize to PNG so both paths get identical pixel data
      const nativeImg = await loadNativeImage(buf);
      const scale = 400 / nativeImg.width;
      const w = 400;
      const h = Math.round(nativeImg.height * scale);
      const rasterCanvas = createCanvas(w, h);
      rasterCanvas.getContext("2d").drawImage(nativeImg, 0, 0, w, h);
      const pngBuffer = rasterCanvas.toBuffer("image/png");

      // Node adapter path
      const nodeResult = await measureImage(pngBuffer);

      // Direct scanPixels path (same pixel extraction the adapter does internally)
      const img = await loadNativeImage(pngBuffer);
      const { sw, sh } = downsampleDimensions(img.width, img.height);
      const canvas = createCanvas(sw, sh);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, sw, sh);
      const imageData = ctx.getImageData(0, 0, sw, sh);
      const data32 = new Uint32Array(imageData.data.buffer);
      const directResult = scanPixels({
        width: img.width,
        height: img.height,
        data32,
        sw,
        sh,
        contrastThreshold: 10,
        includeDensity: true,
      });

      expect(nodeResult.contentBox).toEqual(directResult.contentBox);
      expect(nodeResult.visualCenter).toEqual(directResult.visualCenter);
      expect(nodeResult.pixelDensity).toEqual(directResult.pixelDensity);
      expect(nodeResult.backgroundLuminance).toEqual(
        directResult.backgroundLuminance,
      );
    });
  }
});
