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

  useEffect(() => {
    if (stableLogos.length === 0) {
      dispatch({ type: "empty" });
      return;
    }

    let cancelled = false;
    const blobUrls: string[] = [];
    dispatch({ type: "loading" });

    const sources: LogoSource[] = stableLogos.map(normalizeSource);

    Promise.allSettled(
      sources.map(async (source) => {
        const img = await loadImage(source.src);

        if (cancelled) throw new Error("cancelled");

        const measurement = measureWithContentDetection(
          img,
          contrastThreshold,
          densityAware,
        );

        const effectiveDensityFactor = densityAware ? densityFactor : 0;

        const normalized = createNormalizedLogo(
          source,
          measurement,
          baseSize,
          scaleFactor,
          effectiveDensityFactor,
        );

        if (cropToContent && measurement.contentBox) {
          const url = await cropToBlobUrl(img, measurement.contentBox);
          if (cancelled) {
            URL.revokeObjectURL(url);
            throw new Error("cancelled");
          }
          blobUrls.push(url);
          normalized.croppedSrc = url;
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
      for (const url of blobUrls) {
        URL.revokeObjectURL(url);
      }
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
