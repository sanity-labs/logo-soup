import {
  DEFAULT_BASE_SIZE,
  DEFAULT_CONTRAST_THRESHOLD,
  DEFAULT_CROP_TO_CONTENT,
  DEFAULT_DENSITY_AWARE,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_SCALE_FACTOR,
} from "./constants";
import {
  cropToBlobUrl,
  loadImage,
  measureWithContentDetection,
  resolveBackgroundColor,
} from "./measure";
import { createNormalizedLogo, normalizeSource } from "./normalize";
import type {
  LogoSoupEngine,
  LogoSoupState,
  LogoSource,
  MeasurementResult,
  NormalizedLogo,
  ProcessOptions,
} from "./types";

interface CachedEntry {
  img: HTMLImageElement;
  measurement: MeasurementResult;
  blobUrl?: string;
}

const IDLE_STATE: LogoSoupState = {
  status: "idle",
  normalizedLogos: [],
  error: null,
};

function bgEqual(
  a: [number, number, number] | undefined,
  b: [number, number, number] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function createLogoSoup(): LogoSoupEngine {
  const listeners = new Set<() => void>();
  const cache = new Map<string, CachedEntry>();

  let snapshot: LogoSoupState = IDLE_STATE;
  let cancelCurrent: (() => void) | null = null;
  let destroyed = false;

  // Cache invalidation key — when these change we must re-measure
  let prevContrastThreshold = NaN;
  let prevDensityAware = false;
  let prevResolvedBg: [number, number, number] | undefined;

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(next: LogoSoupState) {
    // Only produce a new snapshot reference if something actually changed
    if (
      snapshot.status === next.status &&
      snapshot.normalizedLogos === next.normalizedLogos &&
      snapshot.error === next.error
    ) {
      return;
    }
    snapshot = next;
    emit();
  }

  function clearCache() {
    for (const entry of cache.values()) {
      if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
    }
    cache.clear();
  }

  function pruneCache(activeSrcs: Set<string>) {
    for (const [src, entry] of cache) {
      if (!activeSrcs.has(src)) {
        if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
        cache.delete(src);
      }
    }
  }

  function process(options: ProcessOptions) {
    if (destroyed) return;

    // Cancel any in-flight work from a previous process() call
    cancelCurrent?.();
    cancelCurrent = null;

    const {
      logos,
      baseSize = DEFAULT_BASE_SIZE,
      scaleFactor = DEFAULT_SCALE_FACTOR,
      contrastThreshold = DEFAULT_CONTRAST_THRESHOLD,
      densityAware = DEFAULT_DENSITY_AWARE,
      densityFactor = DEFAULT_DENSITY_FACTOR,
      cropToContent = DEFAULT_CROP_TO_CONTENT,
      backgroundColor: backgroundColorProp,
    } = options;

    // Empty logos — go straight to ready with empty results
    if (logos.length === 0) {
      setState({ status: "ready", normalizedLogos: [], error: null });
      return;
    }

    const resolvedBg = backgroundColorProp
      ? resolveBackgroundColor(backgroundColorProp)
      : undefined;

    // Invalidate cache when measurement parameters change
    if (
      prevContrastThreshold !== contrastThreshold ||
      prevDensityAware !== densityAware ||
      !bgEqual(prevResolvedBg, resolvedBg)
    ) {
      clearCache();
      prevContrastThreshold = contrastThreshold;
      prevDensityAware = densityAware;
      prevResolvedBg = resolvedBg;
    }

    const sources: LogoSource[] = logos.map(normalizeSource);
    const activeSrcs = new Set(sources.map((s) => s.src));
    pruneCache(activeSrcs);

    const allCached = sources.every((s) => cache.has(s.src));
    const needsCrop =
      cropToContent &&
      sources.some((s) => {
        const entry = cache.get(s.src);
        return entry && !entry.blobUrl && entry.measurement.contentBox;
      });

    const effectiveDensityFactor = densityAware ? densityFactor : 0;

    // Fast path: everything is cached and no pending crops needed
    if (allCached && !needsCrop) {
      const results = sources.map((source) => {
        const entry = cache.get(source.src)!;
        const normalized = createNormalizedLogo(
          source,
          entry.measurement,
          baseSize,
          scaleFactor,
          effectiveDensityFactor,
        );
        if (cropToContent && entry.blobUrl) {
          normalized.croppedSrc = entry.blobUrl;
        }
        return normalized;
      });
      setState({ status: "ready", normalizedLogos: results, error: null });
      return;
    }

    // Async path: need to load/measure some images
    let cancelled = false;
    cancelCurrent = () => {
      cancelled = true;
    };

    if (!allCached) {
      setState({ status: "loading", normalizedLogos: [], error: null });
    }

    Promise.allSettled(
      sources.map(async (source) => {
        let entry = cache.get(source.src);

        if (!entry) {
          const img = await loadImage(source.src);
          if (cancelled) throw new Error("cancelled");

          const measurement = measureWithContentDetection(
            img,
            contrastThreshold,
            densityAware,
            resolvedBg,
          );
          entry = { img, measurement };
          cache.set(source.src, entry);
        }

        const normalized = createNormalizedLogo(
          source,
          entry.measurement,
          baseSize,
          scaleFactor,
          effectiveDensityFactor,
        );

        if (cropToContent && entry.measurement.contentBox && !entry.blobUrl) {
          const url = await cropToBlobUrl(
            entry.img,
            entry.measurement.contentBox,
          );
          if (cancelled) {
            URL.revokeObjectURL(url);
            throw new Error("cancelled");
          }
          entry.blobUrl = url;
        }

        if (cropToContent && entry.blobUrl) {
          normalized.croppedSrc = entry.blobUrl;
        }

        return normalized;
      }),
    ).then((settled) => {
      if (cancelled || destroyed) return;

      const results: NormalizedLogo[] = [];
      let firstError: Error | undefined;
      for (const r of settled) {
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else if (!firstError) {
          firstError =
            r.reason instanceof Error
              ? r.reason
              : new Error("Failed to load logo");
        }
      }

      if (results.length === 0 && firstError) {
        setState({ status: "error", normalizedLogos: [], error: firstError });
        return;
      }

      setState({ status: "ready", normalizedLogos: results, error: null });
    });
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot(): LogoSoupState {
    return snapshot;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelCurrent?.();
    cancelCurrent = null;
    clearCache();
    listeners.clear();
  }

  return { process, subscribe, getSnapshot, destroy };
}
