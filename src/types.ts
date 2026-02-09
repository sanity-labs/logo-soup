import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";

export type AlignmentMode =
  | "bounds"
  | "visual-center"
  | "visual-center-x"
  | "visual-center-y";

export interface LogoSource {
  src: string;
  alt?: string;
}

export interface VisualCenter {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

export interface NormalizedLogo {
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
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasurementResult {
  width: number;
  height: number;
  contentBox?: BoundingBox;
  pixelDensity?: number;
  visualCenter?: VisualCenter;
}

export type ImageRenderProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  style?: CSSProperties;
};

export type RenderImageFn = (props: ImageRenderProps) => ReactNode;

export interface UseLogoSoupOptions {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: [number, number, number];
}

export interface UseLogoSoupResult {
  isLoading: boolean;
  isReady: boolean;
  normalizedLogos: NormalizedLogo[];
  error: Error | null;
}

export interface LogoSoupProps {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: [number, number, number];
  alignBy?: AlignmentMode;
  gap?: number | string;
  renderImage?: RenderImageFn;
  className?: string;
  style?: CSSProperties;
  onNormalized?: (logos: NormalizedLogo[]) => void;
}
