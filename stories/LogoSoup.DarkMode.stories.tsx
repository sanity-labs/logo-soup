import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import {
  type StoryArgs,
  StoryLogoSoup,
  allLogos,
  allLogosInverted,
  allLogosJpg,
  countArgType,
  defaultStoryArgs,
  shuffleArray,
  storyArgTypes,
} from "./shared";

function InvertedSVGs({ count, shuffleSeed, ...rest }: StoryArgs) {
  const logos = useMemo(() => {
    return shuffleArray(allLogosInverted, shuffleSeed).slice(0, count);
  }, [count, shuffleSeed]);

  return (
    <div style={{ background: "#0a0a0a", padding: 16, borderRadius: 8 }}>
      <StoryLogoSoup logos={logos} {...rest} />
    </div>
  );
}

function OpaqueJPGs({ count, shuffleSeed, ...rest }: StoryArgs) {
  const logos = useMemo(() => {
    return shuffleArray(allLogosJpg, shuffleSeed).slice(0, count);
  }, [count, shuffleSeed]);

  return <StoryLogoSoup logos={logos} {...rest} />;
}

function SideBySide({ count, shuffleSeed, ...rest }: StoryArgs) {
  const originals = useMemo(() => {
    return shuffleArray(allLogos, shuffleSeed).slice(0, count);
  }, [count, shuffleSeed]);

  const inverted = useMemo(() => {
    return shuffleArray(allLogosInverted, shuffleSeed).slice(0, count);
  }, [count, shuffleSeed]);

  return (
    <>
      <div style={{ background: "#ffffff", padding: 16, borderRadius: 8 }}>
        <StoryLogoSoup logos={originals} backgroundColor="#ffffff" {...rest} />
      </div>
      <div style={{ background: "#0a0a0a", padding: 16, borderRadius: 8 }}>
        <StoryLogoSoup logos={inverted} backgroundColor="#0a0a0a" {...rest} />
      </div>
    </>
  );
}

const meta: Meta<StoryArgs> = {
  title: "LogoSoup",
  argTypes: {
    count: countArgType(allLogosInverted.length),
    ...storyArgTypes,
  },
  parameters: { layout: "padded" },
};

export default meta;

export const DarkMode: StoryObj<typeof InvertedSVGs> = {
  render: (args) => <InvertedSVGs {...args} />,
  args: defaultStoryArgs,
};

export const JPG: StoryObj<typeof OpaqueJPGs> = {
  render: (args) => <OpaqueJPGs {...args} />,
  args: defaultStoryArgs,
};

export const Comparison: StoryObj<typeof SideBySide> = {
  render: (args) => <SideBySide {...args} />,
  args: defaultStoryArgs,
};
