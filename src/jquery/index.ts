import { install } from "./plugin";

export { install };
export type { LogoSoupPluginOptions } from "./plugin";

// Auto-install if jQuery is available globally
if (typeof window !== "undefined" && (window as any).jQuery) {
  install((window as any).jQuery);
}
