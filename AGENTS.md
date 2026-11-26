# Architecture rules

- Use the April 26, 2026 UI snapshot as the recovery baseline; retain current managed Cloud integration and applied migrations because reverting code must not revert player data or security.
- Keep authentication hydration, lazy-module recovery and error-report throttling from the current implementation because historical UI recovery must not reintroduce known loading failures.
- Later unused modules/assets remain available but personal-space routes are not exposed by this recovery; avoid destructive cleanup while compatibility is being validated.
- Preserve the current story implementation while legacy story tables/RPCs are retired; never recreate incompatible progression or reset player progress during recovery.
- Token-consuming game handlers share a synchronous action gate, and realtime subscriptions use a handler ref; prevent duplicate requests and subscription-driven reload loops.
- PvP validation triggers distinguish authenticated client writes from trusted security-definer operations; protect tokens, tools, confirmed hiding metadata and game results without denying legitimate server actions.
- Use standard Playwright configuration and two opt-in temporary sessions for authenticated PvP regression tests; never store credentials in source.
