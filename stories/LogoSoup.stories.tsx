import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties, ImgHTMLAttributes } from "react";
import { useMemo } from "react";
import {
  DEFAULT_ALIGN_BY,
  DEFAULT_BASE_SIZE,
  DEFAULT_CROP_TO_CONTENT,
  DEFAULT_DENSITY_AWARE,
  DEFAULT_DENSITY_FACTOR,
  DEFAULT_GAP,
  DEFAULT_SCALE_FACTOR,
} from "../src/constants";
import { LogoSoup } from "../src/components/LogoSoup";
import type { AlignmentMode } from "../src/types";
import { allLogos, shuffleArray } from "./shared";

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

interface DebugGridOverlayProps {
  showHorizontalCenter: boolean;
  children: React.ReactNode;
  background?: string;
}

function DebugGridOverlay({
  showHorizontalCenter,
  children,
  background,
}: DebugGridOverlayProps) {
  return (
    <div style={{ position: "relative", background }}>
      {showHorizontalCenter && (
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
      {children}
    </div>
  );
}

interface LogoSoupPlaygroundProps {
  count: number;
  shuffleSeed: number;
  baseSize: number;
  scaleFactor: number;
  densityAware: boolean;
  densityFactor: number;
  cropToContent: boolean;
  alignBy: AlignmentMode;
  gap: number;
  showImageBounds: boolean;
  showContainerBounds: boolean;
  showHorizontalGrid: boolean;
  showVerticalGrid: boolean;
  gridSpacing: number;
}

function LogoSoupPlayground({
  count,
  shuffleSeed,
  baseSize,
  scaleFactor,
  densityAware,
  densityFactor,
  cropToContent,
  alignBy,
  gap,
  showImageBounds,
  showContainerBounds,
  showHorizontalGrid,
  showVerticalGrid,
  gridSpacing,
}: LogoSoupPlaygroundProps) {
  const logos = useMemo(() => {
    const shuffled = shuffleArray(allLogos, shuffleSeed);
    return shuffled.slice(0, count);
  }, [count, shuffleSeed]);

  const showGridOverlay = showHorizontalGrid || showVerticalGrid;
  const gridBackground = createGridBackground(
    showHorizontalGrid,
    showVerticalGrid,
    gridSpacing,
  );

  const containerStyle: CSSProperties | undefined = showContainerBounds
    ? { outline: "2px dashed blue", outlineOffset: 4 }
    : undefined;

  const strip = (
    <LogoSoup
      logos={logos}
      baseSize={baseSize}
      scaleFactor={scaleFactor}
      densityAware={densityAware}
      densityFactor={densityFactor}
      cropToContent={cropToContent}
      alignBy={alignBy}
      gap={gap}
      style={containerStyle}
      renderImage={showImageBounds ? DebugImage : undefined}
    />
  );

  if (!showGridOverlay) {
    return strip;
  }

  return (
    <DebugGridOverlay
      showHorizontalCenter={showHorizontalGrid}
      background={gridBackground}
    >
      {strip}
    </DebugGridOverlay>
  );
}

const meta: Meta<typeof LogoSoupPlayground> = {
  title: "LogoSoup",
  component: LogoSoupPlayground,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    count: {
      name: "Count",
      control: { type: "range", min: 1, max: allLogos.length, step: 1 },
      description: "Number of logos to display",
      table: { category: "Logo Options" },
    },
    shuffleSeed: {
      name: "Shuffle Seed",
      control: { type: "range", min: 1, max: 1000, step: 1 },
      description: "Shuffle seed (change to randomize logo order)",
      table: { category: "Logo Options" },
    },
    baseSize: {
      name: "Base Size",
      control: { type: "range", min: 16, max: 128, step: 4 },
      description: "Base size for normalization",
      table: { category: "Normalization" },
    },
    scaleFactor: {
      name: "Scale Factor",
      control: { type: "range", min: 0, max: 1, step: 0.1 },
      description:
        "Scale factor (0 = uniform widths, 0.5 = balanced, 1 = uniform heights)",
      table: { category: "Normalization" },
    },
    densityAware: {
      name: "Density Aware",
      control: "boolean",
      description: "Enable pixel density compensation",
      table: { category: "Normalization" },
    },
    densityFactor: {
      name: "Density Factor",
      control: { type: "range", min: 0, max: 1, step: 0.1 },
      description:
        "How much density affects sizing (0 = no effect, 1 = full effect)",
      table: { category: "Normalization" },
    },
    cropToContent: {
      name: "Crop to Content",
      control: "boolean",
      description:
        "Crop logos to their content bounds (returns base64 cropped images)",
      table: { category: "Normalization" },
    },
    alignBy: {
      name: "Align By",
      control: "select",
      options: [
        "bounds",
        "visual-center",
        "visual-center-x",
        "visual-center-y",
      ],
      description:
        "Alignment mode: bounds (geometric center), visual-center (weighted center), visual-center-x (horizontal only), or visual-center-y (vertical only)",
      table: {
        category: "Layout",
      },
    },
    gap: {
      name: "Gap",
      control: { type: "range", min: 0, max: 48, step: 4 },
      description: "Gap between logos",
      table: { category: "Layout" },
    },
    showImageBounds: {
      name: "Show Image Bounds",
      control: "boolean",
      description: "Display red bounding boxes around each image element",
      table: { category: "Debug", defaultValue: { summary: "false" } },
    },
    showContainerBounds: {
      name: "Show Container Bounds",
      control: "boolean",
      description: "Display blue dashed outline around the container",
      table: { category: "Debug", defaultValue: { summary: "false" } },
    },
    showHorizontalGrid: {
      name: "Show Horizontal Grid",
      control: "boolean",
      description:
        "Display horizontal grid lines with a center alignment guide",
      table: { category: "Debug", defaultValue: { summary: "false" } },
    },
    showVerticalGrid: {
      name: "Show Vertical Grid",
      control: "boolean",
      description: "Display vertical grid lines",
      table: { category: "Debug", defaultValue: { summary: "false" } },
    },
    gridSpacing: {
      name: "Grid Spacing",
      control: { type: "range", min: 8, max: 64, step: 4 },
      description: "Spacing between grid lines in pixels",
      table: { category: "Debug", defaultValue: { summary: "16" } },
    },
  },
};

export default meta;

type Story = StoryObj<typeof LogoSoupPlayground>;

export const Playground: Story = {
  args: {
    count: allLogos.length / 4,
    shuffleSeed: 42,
    baseSize: DEFAULT_BASE_SIZE,
    scaleFactor: DEFAULT_SCALE_FACTOR,
    densityAware: DEFAULT_DENSITY_AWARE,
    densityFactor: DEFAULT_DENSITY_FACTOR,
    cropToContent: DEFAULT_CROP_TO_CONTENT,
    alignBy: DEFAULT_ALIGN_BY,
    gap: DEFAULT_GAP,
    showImageBounds: false,
    showContainerBounds: false,
    showHorizontalGrid: false,
    showVerticalGrid: false,
    gridSpacing: 16,
  },
};
