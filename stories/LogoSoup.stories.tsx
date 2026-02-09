import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import {
  type StoryArgs,
  StoryLogoSoup,
  allLogos,
  countArgType,
  defaultStoryArgs,
  shuffleArray,
  storyArgTypes,
} from "./shared";

function LogoSoupPlayground({ count, shuffleSeed, ...rest }: StoryArgs) {
  const logos = useMemo(() => {
    return shuffleArray(allLogos, shuffleSeed).slice(0, count);
  }, [count, shuffleSeed]);

  return <StoryLogoSoup logos={logos} {...rest} />;
}

const meta: Meta<typeof LogoSoupPlayground> = {
  title: "LogoSoup",
  component: LogoSoupPlayground,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    count: countArgType(allLogos.length),
    ...storyArgTypes,
  },
};

export default meta;

type Story = StoryObj<typeof LogoSoupPlayground>;

export const Default: Story = {
  args: {
    ...defaultStoryArgs,
    count: Math.floor(allLogos.length / 4),
  },
};
