type HexColor = `#${string}`;
type RGBFunction = `rgb(${string})` | `rgba(${string})`;
type HSLFunction = `hsl(${string})` | `hsla(${string})`;
type CSSColor = HexColor | RGBFunction | HSLFunction | (string & {});

export type BackgroundColor = CSSColor | [number, number, number];

export type AlignmentMode =
  | "bounds"
  | "visual-center"
  | "visual-center-x"
  | "visual-center-y";

export type LogoSource = {
  src: string;
  alt?: string;
};

export type VisualCenter = {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NormalizedLogo = {
  src: string;
  alt: string;
  originalWidth: number;
  originalHeight: number;
  contentBox?: BoundingBox;
  normalizedWidth: number;
  normalizedHeight: number;
  aspectRatio: number;
  pixelDensity?: number;
  visualCenter?: VisualCenter;
  croppedSrc?: string;
};

export type MeasurementResult = {
  width: number;
  height: number;
  contentBox?: BoundingBox;
  pixelDensity?: number;
  visualCenter?: VisualCenter;
  backgroundLuminance?: number;
};

/** Options passed to `engine.process()` */
export type ProcessOptions = {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: BackgroundColor;
};

/** Immutable state snapshot returned by the engine */
export type LogoSoupState = {
  status: "idle" | "loading" | "ready" | "error";
  normalizedLogos: NormalizedLogo[];
  error: Error | null;
};

/** The imperative engine returned by `createLogoSoup()` */
export type LogoSoupEngine = {
  /** Trigger a processing run. Call when inputs change. */
  process(options: ProcessOptions): void;

  /** Cancel in-flight work without tearing down the engine. */
  cancel(): void;

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;

  /**
   * Get current immutable snapshot.
   * Must return the same reference if nothing changed.
   */
  getSnapshot(): LogoSoupState;

  /** Cleanup blob URLs, cancel in-flight work */
  destroy(): void;
};
