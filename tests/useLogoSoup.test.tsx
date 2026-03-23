import { describe, test, expect } from "bun:test";
import { StrictMode, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { useLogoSoup } from "../src/react/use-logo-soup";

const originalImage = globalThis.Image;

describe("useLogoSoup", () => {
  test("returns loading state initially", () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
    } as unknown as typeof Image;

    const { result } = renderHook(() =>
      useLogoSoup({
        logos: ["https://example.com/logo.png"],
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBe(null);

    globalThis.Image = originalImage;
  });

  test("handles empty logos array", async () => {
    const { result } = renderHook(() =>
      useLogoSoup({
        logos: [],
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.normalizedLogos).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  test("normalizes logos when images load successfully", async () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      naturalWidth = 200;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      }
    } as unknown as typeof Image;

    const { result } = renderHook(() =>
      useLogoSoup({
        logos: [
          "https://example.com/logo1.png",
          "https://example.com/logo2.png",
        ],
        baseSize: 48,
        scaleFactor: 0.5,
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.normalizedLogos).toHaveLength(2);
    expect(result.current.normalizedLogos[0]?.src).toBe(
      "https://example.com/logo1.png",
    );
    expect(result.current.normalizedLogos[0]?.originalWidth).toBe(200);
    expect(result.current.normalizedLogos[0]?.originalHeight).toBe(100);
    expect(result.current.normalizedLogos[0]?.normalizedWidth).toBeGreaterThan(
      0,
    );
    expect(result.current.normalizedLogos[0]?.normalizedHeight).toBeGreaterThan(
      0,
    );

    globalThis.Image = originalImage;
  });

  test("handles image load errors", async () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          if (this.onerror) this.onerror();
        });
      }
    } as unknown as typeof Image;

    const { result } = renderHook(() =>
      useLogoSoup({
        logos: ["https://example.com/broken.png"],
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.error).not.toBe(null);

    globalThis.Image = originalImage;
  });

  test("accepts LogoSource objects", async () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      }
    } as unknown as typeof Image;

    const { result } = renderHook(() =>
      useLogoSoup({
        logos: [{ src: "https://example.com/logo.png", alt: "Test Logo" }],
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.normalizedLogos[0]?.alt).toBe("Test Logo");

    globalThis.Image = originalImage;
  });

  test("uses default values for baseSize and scaleFactor", async () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      }
    } as unknown as typeof Image;

    const { result } = renderHook(() =>
      useLogoSoup({
        logos: ["https://example.com/logo.png"],
        densityAware: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.normalizedLogos[0]?.normalizedWidth).toBe(48);
    expect(result.current.normalizedLogos[0]?.normalizedHeight).toBe(48);

    globalThis.Image = originalImage;
  });

  test("recalculates when options change", async () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      naturalWidth = 200;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      }
    } as unknown as typeof Image;

    const { result, rerender } = renderHook(
      ({ baseSize }) =>
        useLogoSoup({
          logos: ["https://example.com/logo.png"],
          baseSize,
          scaleFactor: 0.5,
        }),
      { initialProps: { baseSize: 48 } },
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const firstWidth = result.current.normalizedLogos[0]?.normalizedWidth;

    rerender({ baseSize: 96 });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
      expect(result.current.normalizedLogos[0]?.normalizedWidth).not.toBe(
        firstWidth,
      );
    });

    globalThis.Image = originalImage;
  });

  test("works correctly under React StrictMode (not stuck in loading)", async () => {
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      naturalWidth = 200;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      }
    } as unknown as typeof Image;

    const strictWrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const { result } = renderHook(
      () =>
        useLogoSoup({
          logos: [
            "https://example.com/logo1.png",
            "https://example.com/logo2.png",
          ],
          baseSize: 48,
          scaleFactor: 0.5,
        }),
      { wrapper: strictWrapper },
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.normalizedLogos).toHaveLength(2);
    expect(result.current.error).toBe(null);

    globalThis.Image = originalImage;
  });
});
