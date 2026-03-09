# 🍜 Logo Soup

[![npm version](https://img.shields.io/npm/v/@sanity-labs/logo-soup.svg?style=flat-square)](https://www.npmjs.com/package/@sanity-labs/logo-soup)

A tiny framework-agnostic library that makes logos look good together.

### Before

![Logos without normalization — different sizes, weights, and aspect ratios create visual chaos](static/docs/before.png)

### After

![After normalization — the same logos appear balanced and harmonious](static/docs/after.png)

## Install

```bash
npm install @sanity-labs/logo-soup
```

## Quick Start

```tsx
import { LogoSoup } from "@sanity-labs/logo-soup/react";

function LogoStrip() {
  return (
    <LogoSoup
      logos={[
        { src: "/logos/acme.svg", alt: "Acme Corp" },
        { src: "/logos/globex.svg", alt: "Globex" },
        { src: "/logos/initech.svg", alt: "Initech" },
      ]}
    />
  );
}
```

Works with React, Vue, Svelte, Solid, Angular, jQuery, and vanilla JavaScript.

## Resources

- 📖 [Documentation](https://logo-soup.sanity.dev/docs) — Full API reference, framework guides, and options
- 🎨 [Storybook](https://logo-soup.sanity.dev) — Interactive playground with real logos and tunable parameters
- 📝 [The Logo Soup Problem](https://www.sanity.io/blog/the-logo-soup-problem) — Deep-dive blog post on the problem and the math behind the solution

## Development

```bash
bun install
bun test
bun run build
bun run storybook
```

## License

MIT
