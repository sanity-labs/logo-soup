# @sanity-labs/logo-soup

## 2.0.0

### Major Changes

- [#28](https://github.com/sanity-labs/logo-soup/pull/28) [`6f61604`](https://github.com/sanity-labs/logo-soup/commit/6f6160400f1795de3a67014701d5b4c0cf9818d1) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Multi-framework support. The package is now framework-agnostic with subpath exports for React, Vue, Svelte, Solid, and Angular.
  - `@sanity-labs/logo-soup` — Core engine, types, and utilities
  - `@sanity-labs/logo-soup/react` — `useLogoSoup` hook + `LogoSoup` component
  - `@sanity-labs/logo-soup/vue` — `useLogoSoup` composable
  - `@sanity-labs/logo-soup/svelte` — `createLogoSoup` (Svelte 5 runes)
  - `@sanity-labs/logo-soup/solid` — `useLogoSoup` primitive
  - `@sanity-labs/logo-soup/angular` — `LogoSoupService` injectable
