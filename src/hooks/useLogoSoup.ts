import { useEffect, useReducer } from "react";
import {
  DEFAULT_BASE_SIZE,
  DEFAULT_CONTRAST_THRESHOLD,
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
  cropToDataUrl,
  loadImage,
  measureWithContentDetection,
} from "../utils/measure";
import { createNormalizedLogo, normalizeSource } from "../utils/normalize";

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
    densityAware = true,
    densityFactor = DEFAULT_DENSITY_FACTOR,
    cropToContent = false,
  } = options;

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    if (logos.length === 0) {
      dispatch({ type: "empty" });
      return;
    }

    let cancelled = false;
    dispatch({ type: "loading" });

    const sources: LogoSource[] = logos.map(normalizeSource);

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
          normalized.croppedSrc = cropToDataUrl(img, measurement.contentBox);
        }

        return normalized;
      }),
    ).then((settled) => {
      if (cancelled) return;

      const results = settled
        .filter(
          (r): r is PromiseFulfilledResult<NormalizedLogo> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      dispatch({ type: "success", normalizedLogos: results });
    });

    return () => {
      cancelled = true;
    };
  }, [
    logos,
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
