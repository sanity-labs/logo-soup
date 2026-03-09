import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";
import type {
  AlignmentMode,
  BackgroundColor,
  LogoSource,
  NormalizedLogo,
} from "../core/types";

export type ImageRenderProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  style?: CSSProperties;
};

export type RenderImageFn = (props: ImageRenderProps) => ReactNode;

export type UseLogoSoupOptions = {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: BackgroundColor;
};

export type UseLogoSoupResult = {
  isLoading: boolean;
  isReady: boolean;
  normalizedLogos: NormalizedLogo[];
  error: Error | null;
};

export type LogoSoupProps = {
  logos: (string | LogoSource)[];
  baseSize?: number;
  scaleFactor?: number;
  contrastThreshold?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  backgroundColor?: BackgroundColor;
  alignBy?: AlignmentMode;
  gap?: number | string;
  renderImage?: RenderImageFn;
  className?: string;
  style?: CSSProperties;
  onNormalized?: (logos: NormalizedLogo[]) => void;
};
