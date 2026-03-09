import { describe, expect, test } from "bun:test";
import type { LogoSource, MeasurementResult } from "../src/core/types";
import {
  calculateNormalizedDimensions,
  createNormalizedLogo,
  normalizeSource,
} from "../src/core/normalize";

describe("normalizeSource", () => {
  test("converts string to LogoSource", () => {
    const result = normalizeSource("https://example.com/logo.png");
    expect(result).toEqual({
      src: "https://example.com/logo.png",
      alt: "",
    });
  });

  test("passes through LogoSource object", () => {
    const source: LogoSource = {
      src: "https://example.com/logo.png",
      alt: "Example Logo",
    };
    const result = normalizeSource(source);
    expect(result).toEqual(source);
  });

  test("handles LogoSource without alt", () => {
    const source: LogoSource = {
      src: "https://example.com/logo.png",
    };
    const result = normalizeSource(source);
    expect(result).toEqual({ src: "https://example.com/logo.png" });
  });
});

describe("calculateNormalizedDimensions", () => {
  test("calculates dimensions for square image with default scale factor", () => {
    const measurement: MeasurementResult = { width: 100, height: 100 };
    const result = calculateNormalizedDimensions(measurement, 48, 0.5);
    expect(result.width).toBe(48);
    expect(result.height).toBe(48);
  });

  test("calculates dimensions for wide image", () => {
    const measurement: MeasurementResult = { width: 200, height: 100 };
    const result = calculateNormalizedDimensions(measurement, 48, 0.5);
    expect(result.width).toBeGreaterThan(48);
    expect(result.height).toBeLessThan(48);
  });

  test("calculates dimensions for tall image", () => {
    const measurement: MeasurementResult = { width: 100, height: 200 };
    const result = calculateNormalizedDimensions(measurement, 48, 0.5);
    expect(result.width).toBeLessThan(48);
    expect(result.height).toBeGreaterThan(48);
  });

  test("scaleFactor 0 produces uniform widths", () => {
    const wide: MeasurementResult = { width: 200, height: 100 };
    const tall: MeasurementResult = { width: 100, height: 200 };
    const resultWide = calculateNormalizedDimensions(wide, 48, 0);
    const resultTall = calculateNormalizedDimensions(tall, 48, 0);
    expect(resultWide.width).toBe(48);
    expect(resultTall.width).toBe(48);
  });

  test("scaleFactor 1 produces uniform heights", () => {
    const wide: MeasurementResult = { width: 200, height: 100 };
    const tall: MeasurementResult = { width: 100, height: 200 };
    const resultWide = calculateNormalizedDimensions(wide, 48, 1);
    const resultTall = calculateNormalizedDimensions(tall, 48, 1);
    expect(resultWide.height).toBe(48);
    expect(resultTall.height).toBe(48);
  });

  test("handles zero dimensions gracefully", () => {
    const measurement: MeasurementResult = { width: 0, height: 0 };
    const result = calculateNormalizedDimensions(measurement, 48, 0.5);
    expect(result.width).toBe(48);
    expect(result.height).toBe(48);
  });

  test("uses content box when present", () => {
    const withContentBox: MeasurementResult = {
      width: 200,
      height: 200,
      contentBox: { x: 50, y: 50, width: 100, height: 50 },
    };
    const withoutContentBox: MeasurementResult = {
      width: 200,
      height: 200,
    };
    const resultWith = calculateNormalizedDimensions(withContentBox, 48, 0.5);
    const resultWithout = calculateNormalizedDimensions(
      withoutContentBox,
      48,
      0.5,
    );
    expect(resultWith.width).not.toBe(resultWithout.width);
  });
});

describe("createNormalizedLogo", () => {
  test("creates normalized logo with all properties", () => {
    const source: LogoSource = {
      src: "https://example.com/logo.png",
      alt: "Example",
    };
    const measurement: MeasurementResult = { width: 200, height: 100 };
    const result = createNormalizedLogo(source, measurement, 48, 0.5);

    expect(result.src).toBe("https://example.com/logo.png");
    expect(result.alt).toBe("Example");
    expect(result.originalWidth).toBe(200);
    expect(result.originalHeight).toBe(100);
    expect(result.aspectRatio).toBe(2);
    expect(result.normalizedWidth).toBeGreaterThan(0);
    expect(result.normalizedHeight).toBeGreaterThan(0);
  });

  test("includes content box when present", () => {
    const source: LogoSource = { src: "test.png" };
    const measurement: MeasurementResult = {
      width: 200,
      height: 200,
      contentBox: { x: 10, y: 10, width: 180, height: 180 },
    };
    const result = createNormalizedLogo(source, measurement, 48, 0.5);

    expect(result.contentBox).toEqual({
      x: 10,
      y: 10,
      width: 180,
      height: 180,
    });
  });

  test("defaults alt to empty string", () => {
    const source: LogoSource = { src: "test.png" };
    const measurement: MeasurementResult = { width: 100, height: 100 };
    const result = createNormalizedLogo(source, measurement, 48, 0.5);

    expect(result.alt).toBe("");
  });
});
