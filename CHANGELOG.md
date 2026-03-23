# @sanity-labs/logo-soup

## 1.2.2

### Patch Changes

- [#42](https://github.com/sanity-labs/logo-soup/pull/42) [`8fadbbe`](https://github.com/sanity-labs/logo-soup/commit/8fadbbef66c30153f771d3f392030907820b05d6) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Fixed React `useLogoSoup` hook and `LogoSoup` component getting stuck in loading state when React is running in StrictMode.

  Added `cancel()` method to the engine to separate reversible cancellation from permanent destruction, and reworked the React hook's effect cleanup to follow React's setup → cleanup → setup contract.

## 1.2.0

### Minor Changes

- [#37](https://github.com/sanity-labs/logo-soup/pull/37) [`2474d14`](https://github.com/sanity-labs/logo-soup/commit/2474d14190558c735b2dbdc59aea533eba4bfa61) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Add Node.js adapter (`@sanity-labs/logo-soup/node`) for server-side logo measurement using `@napi-rs/canvas`. Extract shared pixel math into `measureContent` pipeline used by both browser and Node paths. Includes `measureImage`, `measureImages`, and re-exports of `createNormalizedLogo`, `calculateNormalizedDimensions`, and `getVisualCenterTransform` with all supporting types.

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
