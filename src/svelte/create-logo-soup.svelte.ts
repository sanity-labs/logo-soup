import { createSubscriber } from "svelte/reactivity";
import { createLogoSoup as createEngine } from "../core/create-logo-soup";
import type { ProcessOptions, LogoSoupState } from "../core/types";

export function createLogoSoup() {
  const engine = createEngine();

  // createSubscriber returns a function that, when called inside a reactive
  // context ($effect, template expression, $derived), registers the caller
  // as a subscriber. When the engine emits, all subscribers re-run.
  const subscribe = createSubscriber((update) => {
    return engine.subscribe(update);
  });

  return {
    process(options: ProcessOptions) {
      engine.process(options);
    },

    get state(): LogoSoupState {
      subscribe();
      return engine.getSnapshot();
    },

    get isLoading() {
      subscribe();
      return engine.getSnapshot().status === "loading";
    },

    get isReady() {
      subscribe();
      return engine.getSnapshot().status === "ready";
    },

    get normalizedLogos() {
      subscribe();
      return engine.getSnapshot().normalizedLogos;
    },

    get error() {
      subscribe();
      return engine.getSnapshot().error;
    },

    destroy() {
      engine.destroy();
    },
  };
}
