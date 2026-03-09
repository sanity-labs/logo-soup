import { defineConfig } from "@sanity/pkg-utils";

export default defineConfig({
  extract: {
    rules: {
      "ae-internal-missing-underscore": "off",
      "ae-missing-release-tag": "off",
    },
    checkTypes: false,
  },
  runtime: "browser",
  external: [
    "react",
    "react-dom",
    "vue",
    "svelte",
    "svelte/reactivity",
    "solid-js",
    "@angular/core",
  ],
});
