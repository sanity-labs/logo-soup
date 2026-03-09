import React from "react";
import { addons, types } from "storybook/manager-api";
import { BookIcon } from "@storybook/icons";

const DOCS_URL = "https://logo-soup.sanity.dev/docs/introduction";

addons.register("logo-soup/docs-link", () => {
  addons.add("logo-soup/docs-link/toolbar", {
    type: types.TOOL,
    title: "Documentation",
    render: () => (
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "inherit",
          textDecoration: "none",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
      >
        <BookIcon style={{ width: 12, height: 12 }} />
        Docs
      </a>
    ),
  });
});
