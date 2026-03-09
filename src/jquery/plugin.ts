import { createLogoSoup as createEngine } from "../core/create-logo-soup";
import { getVisualCenterTransform } from "../core/get-visual-center-transform";
import { DEFAULT_ALIGN_BY, DEFAULT_GAP } from "../core/constants";
import type {
  AlignmentMode,
  LogoSource,
  NormalizedLogo,
  ProcessOptions,
} from "../core/types";

export type LogoSoupPluginOptions = ProcessOptions & {
  alignBy?: AlignmentMode;
  gap?: number | string;
  onReady?: (logos: NormalizedLogo[]) => void;
  onError?: (error: Error) => void;
};

interface LogoSoupInstance {
  engine: ReturnType<typeof createEngine>;
  unsubscribe: () => void;
  options: LogoSoupPluginOptions;
}

const DATA_KEY = "logoSoup";

function render(
  el: HTMLElement,
  logos: NormalizedLogo[],
  options: LogoSoupPluginOptions,
) {
  const alignBy = options.alignBy ?? DEFAULT_ALIGN_BY;
  const gap = options.gap ?? DEFAULT_GAP;
  const halfGap = typeof gap === "number" ? `${gap / 2}px` : `calc(${gap} / 2)`;

  el.style.textAlign = "center";
  el.style.textWrap = "balance";
  el.innerHTML = "";

  for (const logo of logos) {
    const transform = getVisualCenterTransform(logo, alignBy);

    const wrapper = document.createElement("span");
    wrapper.style.display = "inline-block";
    wrapper.style.verticalAlign = "middle";
    wrapper.style.padding = halfGap;
    wrapper.style.transition = "opacity 0.2s ease-in-out";

    const img = document.createElement("img");
    img.src = logo.croppedSrc || logo.src;
    img.alt = logo.alt;
    img.width = logo.normalizedWidth;
    img.height = logo.normalizedHeight;
    img.style.display = "block";
    img.style.objectFit = "contain";
    img.style.width = `${logo.normalizedWidth}px`;
    img.style.height = `${logo.normalizedHeight}px`;
    if (transform) img.style.transform = transform;

    wrapper.appendChild(img);
    el.appendChild(wrapper);
  }
}

type PluginMethod = "process" | "destroy" | "ready" | "instance";

export function install(jQuery: JQueryStatic): void {
  const $ = jQuery;

  $.fn.extend({
    logoSoup(
      this: JQuery,
      optionsOrMethod?: LogoSoupPluginOptions | PluginMethod,
      methodArg?: ProcessOptions,
    ): JQuery | Promise<NormalizedLogo[]> | LogoSoupInstance | undefined {
      // Method calls on existing instances
      if (typeof optionsOrMethod === "string") {
        const method = optionsOrMethod;

        if (method === "destroy") {
          this.each(function () {
            const instance = $.data(this, DATA_KEY) as
              | LogoSoupInstance
              | undefined;
            if (!instance) return;
            instance.unsubscribe();
            instance.engine.destroy();
            $.removeData(this, DATA_KEY);
            (this as HTMLElement).innerHTML = "";
          });
          return this;
        }

        if (method === "process") {
          if (!methodArg) return this;
          this.each(function () {
            const instance = $.data(this, DATA_KEY) as
              | LogoSoupInstance
              | undefined;
            if (!instance) return;
            Object.assign(instance.options, methodArg);
            instance.engine.process(toProcessOptions(instance.options));
          });
          return this;
        }

        if (method === "ready") {
          const el = this[0];
          if (!el) return Promise.resolve([]);
          const instance = $.data(el, DATA_KEY) as LogoSoupInstance | undefined;
          if (!instance) return Promise.resolve([]);
          const snapshot = instance.engine.getSnapshot();
          if (snapshot.status === "ready")
            return Promise.resolve(snapshot.normalizedLogos);
          if (snapshot.status === "error")
            return Promise.reject(snapshot.error);
          return new Promise<NormalizedLogo[]>((resolve, reject) => {
            const unsub = instance.engine.subscribe(() => {
              const state = instance.engine.getSnapshot();
              if (state.status === "ready") {
                unsub();
                resolve(state.normalizedLogos);
              } else if (state.status === "error") {
                unsub();
                reject(state.error);
              }
            });
          });
        }

        if (method === "instance") {
          const el = this[0];
          return el
            ? ($.data(el, DATA_KEY) as LogoSoupInstance | undefined)
            : undefined;
        }

        return this;
      }

      // Initialization
      const opts = optionsOrMethod ?? { logos: [] };

      this.each(function () {
        // Destroy existing instance if re-initializing
        const existing = $.data(this, DATA_KEY) as LogoSoupInstance | undefined;
        if (existing) {
          existing.unsubscribe();
          existing.engine.destroy();
        }

        const el = this as HTMLElement;
        const engine = createEngine();

        const unsubscribe = engine.subscribe(() => {
          const state = engine.getSnapshot();
          el.dataset.logoSoupLoading = String(state.status === "loading");

          if (state.status === "ready") {
            render(el, state.normalizedLogos, opts);
            opts.onReady?.(state.normalizedLogos);
          } else if (state.status === "error" && state.error) {
            opts.onError?.(state.error);
          }
        });

        const instance: LogoSoupInstance = {
          engine,
          unsubscribe,
          options: opts,
        };
        $.data(this, DATA_KEY, instance);

        engine.process(toProcessOptions(opts));
      });

      return this;
    },
  });
}

function toProcessOptions(opts: LogoSoupPluginOptions): ProcessOptions {
  return {
    logos: opts.logos,
    baseSize: opts.baseSize,
    scaleFactor: opts.scaleFactor,
    contrastThreshold: opts.contrastThreshold,
    densityAware: opts.densityAware,
    densityFactor: opts.densityFactor,
    cropToContent: opts.cropToContent,
    backgroundColor: opts.backgroundColor,
  };
}
