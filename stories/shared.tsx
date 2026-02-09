import type { CSSProperties, ImgHTMLAttributes } from "react";
import { LogoSoup } from "../src/components/LogoSoup";
import type { LogoSoupProps } from "../src/types";
import {
  DEFAULT_ALIGN_BY,
  DEFAULT_BASE_SIZE,
  DEFAULT_DENSITY_AWARE,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_GAP,
  DEFAULT_SCALE_FACTOR,
} from "../src/constants";

const logoNames = [
  "aether",
  "athena",
  "browser-comp",
  "burlington",
  "carhartt-wip",
  "clerk",
  "coda",
  "commerce-ui",
  "conductor",
  "cursor",
  "customer.io",
  "dbt",
  "dom-perignon",
  "elemeno-health",
  "eurostar",
  "expedia",
  "fanduel",
  "fnatic",
  "frame",
  "frontier",
  "gaga",
  "gala-games",
  "gfinity",
  "good-american",
  "hinge",
  "hipp",
  "hunter-douglas",
  "kahoot",
  "keystone",
  "lift-foil",
  "loveholidays",
  "lvmh",
  "mejuri",
  "metacore",
  "mr-marvis",
  "new-day",
  "nordstrom",
  "nour-hammour",
  "paytronix",
  "pinecone",
  "poc",
  "powerhouse",
  "primary-bid",
  "rad-power-bikes",
  "redis",
  "reforge",
  "render",
  "replit",
  "retool",
  "rich-brilliant-lighting",
  "rikstv",
  "rona",
  "samsung",
  "scalapay",
  "siemens",
  "spanx",
  "stereolabs",
  "summersalt",
  "supreme",
  "too-good-to-go",
  "tula",
  "unity",
  "wetransfer",
];

export const allLogos = logoNames.map(
  (n) => new URL(`../static/logos/${n}.svg`, import.meta.url).href,
);

export const allLogosInverted = logoNames.map(
  (n) => new URL(`../static/logos-inverted/${n}.svg`, import.meta.url).href,
);

export const allLogosJpg = logoNames.map(
  (n) => new URL(`../static/logos-jpg/${n}.jpg`, import.meta.url).href,
);

export const defaultStoryArgs = {
  count: 20,
  shuffleSeed: 42,
  baseSize: DEFAULT_BASE_SIZE,
  scaleFactor: DEFAULT_SCALE_FACTOR,
  densityAware: DEFAULT_DENSITY_AWARE,
  densityFactor: DEFAULT_DENSITY_FACTOR,
  cropToContent: false,
  alignBy: DEFAULT_ALIGN_BY,
  gap: DEFAULT_GAP,
  showImageBounds: false,
  showContainerBounds: false,
  showHorizontalGrid: false,
  showVerticalGrid: false,
  gridSpacing: 16,
};

export type StoryArgs = typeof defaultStoryArgs;

export function countArgType(max: number) {
  return {
    control: { type: "range" as const, min: 1, max, step: 1 },
    table: { category: "Logo Options" },
  };
}

export const storyArgTypes = {
  shuffleSeed: {
    control: { type: "range" as const, min: 1, max: 1000, step: 1 },
    table: { category: "Logo Options" },
  },
  baseSize: {
    control: { type: "range" as const, min: 16, max: 128, step: 4 },
    table: { category: "Normalization" },
  },
  scaleFactor: {
    control: { type: "range" as const, min: 0, max: 1, step: 0.1 },
    table: { category: "Normalization" },
  },
  densityAware: {
    control: "boolean" as const,
    table: { category: "Normalization" },
  },
  densityFactor: {
    control: { type: "range" as const, min: 0, max: 1, step: 0.1 },
    table: { category: "Normalization" },
  },
  cropToContent: {
    control: "boolean" as const,
    table: { category: "Normalization" },
  },
  alignBy: {
    control: "select" as const,
    options: ["bounds", "visual-center", "visual-center-x", "visual-center-y"],
    table: { category: "Layout" },
  },
  gap: {
    control: { type: "range" as const, min: 0, max: 48, step: 4 },
    table: { category: "Layout" },
  },
  showImageBounds: {
    control: "boolean" as const,
    table: { category: "Debug" },
  },
  showContainerBounds: {
    control: "boolean" as const,
    table: { category: "Debug" },
  },
  showHorizontalGrid: {
    control: "boolean" as const,
    table: { category: "Debug" },
  },
  showVerticalGrid: {
    control: "boolean" as const,
    table: { category: "Debug" },
  },
  gridSpacing: {
    control: { type: "range" as const, min: 8, max: 64, step: 4 },
    table: { category: "Debug" },
  },
};

const debugImageStyles: CSSProperties = {
  outline: "1px solid red",
  background:
    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,0,0,0.05) 5px, rgba(255,0,0,0.05) 10px)",
};

function DebugImage({
  alt,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt={alt} style={{ ...style, ...debugImageStyles }} {...props} />;
}

function createGridBackground(
  showHorizontal: boolean,
  showVertical: boolean,
  spacing: number,
): string | undefined {
  const backgrounds: string[] = [];
  if (showHorizontal) {
    backgrounds.push(
      `repeating-linear-gradient(0deg, transparent, transparent ${spacing - 1}px, rgba(0,200,0,0.3) ${spacing - 1}px, rgba(0,200,0,0.3) ${spacing}px)`,
    );
  }
  if (showVertical) {
    backgrounds.push(
      `repeating-linear-gradient(90deg, transparent, transparent ${spacing - 1}px, rgba(0,200,0,0.3) ${spacing - 1}px, rgba(0,200,0,0.3) ${spacing}px)`,
    );
  }
  return backgrounds.length > 0 ? backgrounds.join(", ") : undefined;
}

export function StoryLogoSoup({
  logos,
  showImageBounds,
  showContainerBounds,
  showHorizontalGrid,
  showVerticalGrid,
  gridSpacing,
  style,
  ...soupProps
}: Omit<LogoSoupProps, "logos"> & {
  logos: string[];
  showImageBounds: boolean;
  showContainerBounds: boolean;
  showHorizontalGrid: boolean;
  showVerticalGrid: boolean;
  gridSpacing: number;
}) {
  const containerStyle: CSSProperties = {
    ...style,
    ...(showContainerBounds && {
      outline: "2px dashed blue",
      outlineOffset: 4,
    }),
  };

  const strip = (
    <LogoSoup
      logos={logos}
      style={containerStyle}
      renderImage={showImageBounds ? DebugImage : undefined}
      {...soupProps}
    />
  );

  const showGrid = showHorizontalGrid || showVerticalGrid;
  if (!showGrid) return strip;

  const gridBackground = createGridBackground(
    showHorizontalGrid,
    showVerticalGrid,
    gridSpacing,
  );

  return (
    <div style={{ position: "relative", background: gridBackground }}>
      {showHorizontalGrid && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: 2,
            background: "rgba(255,0,0,0.5)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
      {strip}
    </div>
  );
}

export function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  let randomValue: number;

  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (currentIndex !== 0) {
    randomValue = Math.floor(seededRandom() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomValue]] = [
      shuffled[randomValue],
      shuffled[currentIndex],
    ];
  }

  return shuffled;
}
