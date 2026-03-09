// Core — framework-agnostic
export { createLogoSoup } from "./core/create-logo-soup";
export { getVisualCenterTransform } from "./core/get-visual-center-transform";
export { cropToDataUrl } from "./core/measure";
export {
  calculateNormalizedDimensions,
  createNormalizedLogo,
} from "./core/normalize";
export {
  DEFAULT_ALIGN_BY,
  DEFAULT_BASE_SIZE,
  DEFAULT_CONTRAST_THRESHOLD,
  DEFAULT_CROP_TO_CONTENT,
  DEFAULT_DENSITY_AWARE,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_GAP,
  DEFAULT_SCALE_FACTOR,
} from "./core/constants";
export type {
  AlignmentMode,
  BackgroundColor,
  BoundingBox,
  LogoSoupEngine,
  LogoSoupState,
  LogoSource,
  MeasurementResult,
  NormalizedLogo,
  ProcessOptions,
  VisualCenter,
} from "./core/types";

// React adapter
export { LogoSoup } from "./react/logo-soup";
export { useLogoSoup } from "./react/use-logo-soup";
export type {
  ImageRenderProps,
  LogoSoupProps,
  RenderImageFn,
  UseLogoSoupOptions,
  UseLogoSoupResult,
} from "./react/types";
