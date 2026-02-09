import { describe, expect, test } from "bun:test";
import { analyzePerimeter } from "../src/utils/measure";

function rgba(r: number, g: number, b: number, a: number): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function fillGrid(
  sw: number,
  sh: number,
  fill: number,
): Uint32Array {
  const data = new Uint32Array(sw * sh);
  data.fill(fill);
  return data;
}

describe("analyzePerimeter", () => {
  test("detects transparent background when perimeter is mostly transparent", () => {
    const sw = 5;
    const sh = 5;
    const transparent = rgba(0, 0, 0, 0);
    const opaque = rgba(255, 0, 0, 255);
    const data = fillGrid(sw, sh, transparent);
    // place some opaque content in the center only
    data[12] = opaque;

    const result = analyzePerimeter(data, sw, sh);
    expect(result.transparent).toBe(true);
  });

  test("detects opaque white background from perimeter", () => {
    const sw = 10;
    const sh = 10;
    const white = rgba(255, 255, 255, 255);
    const red = rgba(255, 0, 0, 255);
    const data = fillGrid(sw, sh, white);
    // paint a red block in the interior (never touches edges)
    for (let y = 3; y < 7; y++) {
      for (let x = 3; x < 7; x++) {
        data[y * sw + x] = red;
      }
    }

    const result = analyzePerimeter(data, sw, sh);
    expect(result.transparent).toBe(false);
    expect(result.bgR).toBeGreaterThan(250);
    expect(result.bgG).toBeGreaterThan(250);
    expect(result.bgB).toBeGreaterThan(250);
  });

  test("detects opaque dark background from perimeter", () => {
    const sw = 10;
    const sh = 10;
    const dark = rgba(20, 20, 25, 255);
    const white = rgba(255, 255, 255, 255);
    const data = fillGrid(sw, sh, dark);
    data[4 * sw + 5] = white;
    data[5 * sw + 5] = white;

    const result = analyzePerimeter(data, sw, sh);
    expect(result.transparent).toBe(false);
    expect(result.bgR).toBeLessThan(30);
    expect(result.bgG).toBeLessThan(30);
    expect(result.bgB).toBeLessThan(30);
  });

  test("dominant color wins when logo bleeds to one edge", () => {
    const sw = 10;
    const sh = 10;
    const blue = rgba(0, 100, 200, 255);
    const yellow = rgba(255, 220, 0, 255);
    const data = fillGrid(sw, sh, blue);
    // logo color covers the entire right edge
    for (let y = 0; y < sh; y++) {
      data[y * sw + (sw - 1)] = yellow;
    }

    const result = analyzePerimeter(data, sw, sh);
    expect(result.transparent).toBe(false);
    // blue dominates top, bottom, and left edges
    expect(result.bgR).toBeLessThan(30);
    expect(result.bgG).toBeGreaterThan(80);
    expect(result.bgB).toBeGreaterThan(170);
  });
});
