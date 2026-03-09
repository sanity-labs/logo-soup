import {
  shallowRef,
  watchEffect,
  onScopeDispose,
  toValue,
  computed,
  type MaybeRefOrGetter,
  type ShallowRef,
  type ComputedRef,
} from "vue";
import { createLogoSoup } from "../core/create-logo-soup";
import type {
  BackgroundColor,
  LogoSource,
  LogoSoupState,
  NormalizedLogo,
} from "../core/types";

export type UseLogoSoupOptions = {
  logos: MaybeRefOrGetter<(string | LogoSource)[]>;
  baseSize?: MaybeRefOrGetter<number | undefined>;
  scaleFactor?: MaybeRefOrGetter<number | undefined>;
  contrastThreshold?: MaybeRefOrGetter<number | undefined>;
  densityAware?: MaybeRefOrGetter<boolean | undefined>;
  densityFactor?: MaybeRefOrGetter<number | undefined>;
  cropToContent?: MaybeRefOrGetter<boolean | undefined>;
  backgroundColor?: MaybeRefOrGetter<BackgroundColor | undefined>;
};

export type UseLogoSoupReturn = {
  /** Raw reactive state from the engine */
  state: ShallowRef<LogoSoupState>;
  isLoading: ComputedRef<boolean>;
  isReady: ComputedRef<boolean>;
  normalizedLogos: ComputedRef<NormalizedLogo[]>;
  error: ComputedRef<Error | null>;
};

export function useLogoSoup(options: UseLogoSoupOptions): UseLogoSoupReturn {
  const engine = createLogoSoup();
  const state = shallowRef<LogoSoupState>(engine.getSnapshot());

  const unsubscribe = engine.subscribe(() => {
    state.value = engine.getSnapshot();
  });

  // watchEffect auto-tracks reactive reads inside it.
  // When any option (ref/getter) changes, this re-runs.
  watchEffect(() => {
    engine.process({
      logos: toValue(options.logos),
      baseSize: toValue(options.baseSize),
      scaleFactor: toValue(options.scaleFactor),
      contrastThreshold: toValue(options.contrastThreshold),
      densityAware: toValue(options.densityAware),
      densityFactor: toValue(options.densityFactor),
      cropToContent: toValue(options.cropToContent),
      backgroundColor: toValue(options.backgroundColor),
    });
  });

  onScopeDispose(() => {
    unsubscribe();
    engine.destroy();
  });

  const isLoading = computed(() => state.value.status === "loading");
  const isReady = computed(() => state.value.status === "ready");
  const normalizedLogos = computed(() => state.value.normalizedLogos);
  const error = computed(() => state.value.error);

  return { state, isLoading, isReady, normalizedLogos, error };
}
