import { type CSSProperties, useEffect } from "react";
import { DEFAULT_ALIGN_BY, DEFAULT_GAP } from "../constants";
import { useLogoSoup } from "../hooks/useLogoSoup";
import type { ImageRenderProps, LogoSoupProps } from "../types";
import { getVisualCenterTransform } from "../utils/getVisualCenterTransform";

const logoWrapperStyle: CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  transition: "opacity 0.2s ease-in-out",
};

const logoImageStyle: CSSProperties = {
  display: "block",
  objectFit: "contain",
};

function DefaultImage(props: ImageRenderProps) {
  return <img {...props} />;
}

export function LogoSoup({
  logos,
  baseSize,
  scaleFactor,
  contrastThreshold,
  densityAware,
  densityFactor,
  cropToContent,
  backgroundColor,
  alignBy = DEFAULT_ALIGN_BY,
  gap = DEFAULT_GAP,
  renderImage,
  className,
  style,
  onNormalized,
}: LogoSoupProps) {
  const { isLoading, isReady, normalizedLogos, error } = useLogoSoup({
    logos,
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
    backgroundColor,
  });

  const ImageComponent = renderImage || DefaultImage;

  useEffect(() => {
    if (isReady && onNormalized) {
      onNormalized(normalizedLogos);
    }
  }, [isReady, normalizedLogos, onNormalized]);

  const halfGap = typeof gap === "number" ? `${gap / 2}px` : `calc(${gap} / 2)`;

  const containerStyle: CSSProperties = {
    textAlign: "center",
    textWrap: "balance",
    ...style,
  };

  if (error) {
    return null;
  }

  return (
    <div
      className={className}
      style={containerStyle}
      data-logo-soup-loading={isLoading}
    >
      {normalizedLogos.map((logo, index) => {
        const transform = getVisualCenterTransform(logo, alignBy);

        return (
          <span
            key={`${logo.src}-${index}`}
            style={{
              ...logoWrapperStyle,
              padding: halfGap,
              opacity: isLoading ? 0 : 1,
            }}
          >
            <ImageComponent
              src={logo.croppedSrc || logo.src}
              alt={logo.alt}
              width={logo.normalizedWidth}
              height={logo.normalizedHeight}
              style={{
                ...logoImageStyle,
                width: logo.normalizedWidth,
                height: logo.normalizedHeight,
                transform,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
