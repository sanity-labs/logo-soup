# @sanity-labs/logo-soup

## 1.1.0

### Minor Changes

- [#30](https://github.com/sanity-labs/logo-soup/pull/30) [`39a6e18`](https://github.com/sanity-labs/logo-soup/commit/39a6e1899b6c5911563bc4f3943b1bdec11ad846) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Add jQuery 4.x adapter via `@sanity-labs/logo-soup/jquery`. Provides a `$.fn.logoSoup` plugin with `process`, `ready`, `destroy`, and `instance` methods. Auto-installs onto `window.jQuery` if available, or call `install($)` manually with a bundler.

## 2.0.0

### Major Changes

- [#28](https://github.com/sanity-labs/logo-soup/pull/28) [`6f61604`](https://github.com/sanity-labs/logo-soup/commit/6f6160400f1795de3a67014701d5b4c0cf9818d1) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Multi-framework support. The package is now framework-agnostic with subpath exports for React, Vue, Svelte, Solid, and Angular.
  - `@sanity-labs/logo-soup` — Core engine, types, and utilities
  - `@sanity-labs/logo-soup/react` — `useLogoSoup` hook + `LogoSoup` component
  - `@sanity-labs/logo-soup/vue` — `useLogoSoup` composable
  - `@sanity-labs/logo-soup/svelte` — `createLogoSoup` (Svelte 5 runes)
  - `@sanity-labs/logo-soup/solid` — `useLogoSoup` primitive
  - `@sanity-labs/logo-soup/angular` — `LogoSoupService` injectable
