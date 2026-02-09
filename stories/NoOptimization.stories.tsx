import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { allLogos, shuffleArray } from "./shared";

interface NoOptimizationProps {
  count: number;
  shuffleSeed: number;
  maxHeight: number;
  gap: number;
}

function NoOptimizationStrip({
  count,
  shuffleSeed,
  maxHeight,
  gap,
}: NoOptimizationProps) {
  const logos = useMemo(() => {
    const shuffled = shuffleArray(allLogos, shuffleSeed);
    return shuffled.slice(0, count);
  }, [count, shuffleSeed]);

  const containerStyle: CSSProperties = {
    textAlign: "center",
    textWrap: "balance",
  };

  const halfGap = gap / 2;

  return (
    <div style={containerStyle}>
      {logos.map((logo, index) => (
        <span
          key={logo}
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            padding: halfGap,
          }}
        >
          <img
            src={logo}
            alt={`Logo ${index + 1}`}
            style={{
              display: "block",
              maxHeight,
              width: "auto",
              objectFit: "contain",
            }}
          />
        </span>
      ))}
    </div>
  );
}

const meta: Meta<typeof NoOptimizationStrip> = {
  title: "No Optimization (Worst Case)",
  component: NoOptimizationStrip,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    count: {
      name: "Count",
      control: { type: "range", min: 1, max: allLogos.length, step: 1 },
      description: "Number of logos to display",
    },
    shuffleSeed: {
      name: "Shuffle Seed",
      control: { type: "range", min: 1, max: 1000, step: 1 },
      description: "Shuffle seed (change to randomize logo order)",
    },
    maxHeight: {
      name: "Max Height",
      control: { type: "range", min: 16, max: 128, step: 4 },
      description: "Maximum height constraint for logos",
    },
    gap: {
      name: "Gap",
      control: { type: "range", min: 0, max: 48, step: 4 },
      description: "Gap between logos",
    },
  },
};

export default meta;

type Story = StoryObj<typeof NoOptimizationStrip>;

export const Default: Story = {
  args: {
    count: Math.floor(allLogos.length / 4),
    shuffleSeed: 42,
    maxHeight: 40,
    gap: 24,
  },
};
