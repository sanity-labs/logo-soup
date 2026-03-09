import React from "react";
import { addons, types } from "storybook/manager-api";
import { BookIcon } from "@storybook/icons";
import { ToggleButton } from "storybook/internal/components";

const DOCS_URL = "https://logo-soup.sanity.dev/docs/introduction";

addons.register("logo-soup/docs-link", () => {
  addons.add("logo-soup/docs-link/toolbar", {
    type: types.TOOL,
    title: "Documentation",
    render: () => (
      <ToggleButton
        key="docs-link"
        padding="small"
        variant="ghost"
        pressed={false}
        onClick={() => window.open(DOCS_URL, "_blank", "noopener,noreferrer")}
        ariaLabel="Open documentation"
        tooltip="Open documentation"
      >
        <BookIcon />
      </ToggleButton>
    ),
  });
});
