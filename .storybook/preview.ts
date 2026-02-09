import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    options: {
      storySort: {
        order: [
          "LogoSoup",
          ["Default", "Dark Mode", "JPG", "Comparison"],
          "No Optimization (Worst Case)",
        ],
      },
    },
  },
};

export default preview;
