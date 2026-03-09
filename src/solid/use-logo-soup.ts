import { from, createEffect, onCleanup } from "solid-js";
import { createLogoSoup as createEngine } from "../core/create-logo-soup";
import type {
  LogoSoupState,
  NormalizedLogo,
  ProcessOptions,
} from "../core/types";

const IDLE_STATE: LogoSoupState = {
  status: "idle",
  normalizedLogos: [],
  error: null,
};

export type UseLogoSoupResult = {
  readonly isLoading: boolean;
  readonly isReady: boolean;
  readonly normalizedLogos: NormalizedLogo[];
  readonly error: Error | null;
};

export function useLogoSoup(optionsFn: () => ProcessOptions): UseLogoSoupResult {
  const engine = createEngine();

  // from() accepts a producer function: (setter) => unsubscribe
  // It creates a signal that updates whenever the engine emits.
  const state = from<LogoSoupState>((set) => {
    set(engine.getSnapshot());
    return engine.subscribe(() => set(engine.getSnapshot()));
  });

  // createEffect re-runs when optionsFn()'s dependencies change.
  // Solid tracks fine-grained — only the signals read inside optionsFn() are tracked.
  createEffect(() => {
    engine.process(optionsFn());
  });

  onCleanup(() => engine.destroy());

  return {
    get isLoading() {
      return (state() ?? IDLE_STATE).status === "loading";
    },
    get isReady() {
      return (state() ?? IDLE_STATE).status === "ready";
    },
    get normalizedLogos() {
      return (state() ?? IDLE_STATE).normalizedLogos;
    },
    get error() {
      return (state() ?? IDLE_STATE).error;
    },
  };
}
