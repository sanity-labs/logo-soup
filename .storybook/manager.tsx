import React from "react";
import { addons, types } from "storybook/manager-api";
import { BookIcon } from "@storybook/icons";
import { Button } from "storybook/internal/components";

const DOCS_URL = "https://logo-soup.sanity.dev/docs/introduction";

addons.register("logo-soup/docs-link", () => {
  addons.add("logo-soup/docs-link/toolbar", {
    type: types.TOOL,
    title: "Documentation",
    render: () => (
      <Button
        as="a"
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="ghost"
        ariaLabel={false}
      >
        <BookIcon />
        Docs
      </Button>
    ),
  });
});
