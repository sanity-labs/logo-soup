import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createLogoSoup } from "../core/create-logo-soup";
import { logosEqual } from "../core/normalize";
import type { LogoSoupState } from "../core/types";
import type { UseLogoSoupOptions, UseLogoSoupResult } from "./types";

const SERVER_SNAPSHOT: LogoSoupState = {
  status: "idle",
  normalizedLogos: [],
  error: null,
};

function getServerSnapshot(): LogoSoupState {
  return SERVER_SNAPSHOT;
}

export function useLogoSoup(options: UseLogoSoupOptions): UseLogoSoupResult {
  const engineRef = useRef<ReturnType<typeof createLogoSoup> | null>(null);
  if (!engineRef.current) {
    engineRef.current = createLogoSoup();
  }
  const engine = engineRef.current;

  // Must be referentially stable to avoid resubscription every render
  const subscribe = useCallback(
    (onStoreChange: () => void) => engine.subscribe(onStoreChange),
    [engine],
  );
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Stabilize the logos array reference to prevent infinite re-renders.
  // Without this, a new array literal in the parent's render (e.g. logos={[a, b]})
  // causes useEffect to re-fire, which calls process(), which emits a state change,
  // which triggers useSyncExternalStore to re-render, which creates a new array, etc.
  const logosRef = useRef(options.logos);
  if (!logosEqual(logosRef.current, options.logos)) {
    logosRef.current = options.logos;
  }
  const stableLogos = logosRef.current;

  const {
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
    backgroundColor,
  } = options;

  // Holds a deferred destroy timer so that StrictMode remounts can cancel it
  // before it fires. On a real unmount no remount follows and the timer
  // completes, cleaning up blob URLs and other resources.
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Single effect: process on mount / when options change, cancel + deferred
  // destroy on cleanup. This satisfies React's setup → cleanup → setup contract:
  //   setup:   cancel pending destroy (StrictMode remount), start processing
  //   cleanup: cancel in-flight work, schedule destroy (real unmount lets it fire)
  useEffect(() => {
    clearTimeout(destroyTimerRef.current);

    engine.process({
      logos: stableLogos,
      baseSize,
      scaleFactor,
      contrastThreshold,
      densityAware,
      densityFactor,
      cropToContent,
      backgroundColor,
    });

    return () => {
      engine.cancel();
      destroyTimerRef.current = setTimeout(() => engine.destroy(), 0);
    };
  }, [
    engine,
    stableLogos,
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
    backgroundColor,
  ]);

  return {
    isLoading: state.status === "loading",
    isReady: state.status === "ready",
    normalizedLogos: state.normalizedLogos,
    error: state.error,
  };
}
