import { useEffect, useReducer, useRef } from "react";
import {
  DEFAULT_BASE_SIZE,
  DEFAULT_CONTRAST_THRESHOLD,
  DEFAULT_CROP_TO_CONTENT,
  DEFAULT_DENSITY_AWARE,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_SCALE_FACTOR,
} from "../constants";
import type {
  LogoSource,
  MeasurementResult,
  NormalizedLogo,
  UseLogoSoupOptions,
  UseLogoSoupResult,
} from "../types";
import {
  cropToBlobUrl,
  loadImage,
  measureWithContentDetection,
} from "../utils/measure";
import {
  createNormalizedLogo,
  logosEqual,
  normalizeSource,
} from "../utils/normalize";

interface CachedEntry {
  img: HTMLImageElement;
  measurement: MeasurementResult;
  blobUrl?: string;
}

type State = {
  isLoading: boolean;
  normalizedLogos: NormalizedLogo[];
  error: Error | null;
};

type Action =
  | { type: "loading" }
  | { type: "success"; normalizedLogos: NormalizedLogo[] }
  | { type: "error"; error: Error }
  | { type: "empty" };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { isLoading: true, normalizedLogos: [], error: null };
    case "success":
      return {
        isLoading: false,
        normalizedLogos: action.normalizedLogos,
        error: null,
      };
    case "error":
      return { isLoading: false, normalizedLogos: [], error: action.error };
    case "empty":
      return { isLoading: false, normalizedLogos: [], error: null };
  }
}

const INITIAL_STATE: State = {
  isLoading: true,
  normalizedLogos: [],
  error: null,
};

function clearCache(cache: Map<string, CachedEntry>) {
  for (const entry of cache.values()) {
    if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
  }
  cache.clear();
}

function pruneCache(cache: Map<string, CachedEntry>, activeSrcs: Set<string>) {
  for (const [src, entry] of cache) {
    if (!activeSrcs.has(src)) {
      if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
      cache.delete(src);
    }
  }
}

export function useLogoSoup(options: UseLogoSoupOptions): UseLogoSoupResult {
  const {
    logos,
    baseSize = DEFAULT_BASE_SIZE,
    scaleFactor = DEFAULT_SCALE_FACTOR,
    contrastThreshold = DEFAULT_CONTRAST_THRESHOLD,
    densityAware = DEFAULT_DENSITY_AWARE,
    densityFactor = DEFAULT_DENSITY_FACTOR,
    cropToContent = DEFAULT_CROP_TO_CONTENT,
  } = options;

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const logosRef = useRef(logos);
  if (!logosEqual(logosRef.current, logos)) {
    logosRef.current = logos;
  }
  const stableLogos = logosRef.current;

  const cacheRef = useRef(new Map<string, CachedEntry>());
  const cacheKeyRef = useRef({
    contrastThreshold: NaN,
    densityAware: false,
  });

  useEffect(() => {
    return () => clearCache(cacheRef.current);
  }, []);

  useEffect(() => {
    if (stableLogos.length === 0) {
      dispatch({ type: "empty" });
      return;
    }

    const cache = cacheRef.current;
    const prevKey = cacheKeyRef.current;

    if (
      prevKey.contrastThreshold !== contrastThreshold ||
      prevKey.densityAware !== densityAware
    ) {
      clearCache(cache);
      cacheKeyRef.current = { contrastThreshold, densityAware };
    }

    const sources: LogoSource[] = stableLogos.map(normalizeSource);
    const activeSrcs = new Set(sources.map((s) => s.src));
    pruneCache(cache, activeSrcs);

    const allCached = sources.every((s) => cache.has(s.src));
    const needsCrop =
      cropToContent &&
      sources.some((s) => {
        const entry = cache.get(s.src);
        return entry && !entry.blobUrl && entry.measurement.contentBox;
      });

    if (allCached && !needsCrop) {
      const effectiveDensityFactor = densityAware ? densityFactor : 0;
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
      dispatch({ type: "success", normalizedLogos: results });
      return;
    }

    let cancelled = false;
    if (!allCached) {
      dispatch({ type: "loading" });
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
          );
          entry = { img, measurement };
          cache.set(source.src, entry);
        }

        const effectiveDensityFactor = densityAware ? densityFactor : 0;

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
      if (cancelled) return;

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
        dispatch({ type: "error", error: firstError });
        return;
      }

      dispatch({ type: "success", normalizedLogos: results });
    });

    return () => {
      cancelled = true;
    };
  }, [
    stableLogos,
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
  ]);

  return {
    isLoading: state.isLoading,
    isReady: !state.isLoading && state.error === null,
    normalizedLogos: state.normalizedLogos,
    error: state.error,
  };
}
