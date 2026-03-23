---
"@sanity-labs/logo-soup": patch
---

Fixed React `useLogoSoup` hook and `LogoSoup` component getting stuck in loading state when React is running in StrictMode.

Added `cancel()` method to the engine to separate reversible cancellation from permanent destruction, and reworked the React hook's effect cleanup to follow React's setup → cleanup → setup contract.
