# Architecture rules

- Use the April 26, 2026 UI snapshot as the recovery baseline; retain current managed Cloud integration and applied migrations because reverting code must not revert player data or security.
- Keep authentication hydration, lazy-module recovery and error-report throttling from the current implementation because historical UI recovery must not reintroduce known loading failures.
- Later unused modules/assets remain available but personal-space routes are not exposed by this recovery; avoid destructive cleanup while compatibility is being validated.
- Preserve the current story implementation while legacy story tables/RPCs are retired; never recreate incompatible progression or reset player progress during recovery.
- Token-consuming game handlers share a synchronous action gate, and realtime subscriptions use a handler ref; prevent duplicate requests and subscription-driven reload loops.
- PvP validation triggers distinguish authenticated client writes from trusted security-definer operations; protect tokens, tools, confirmed hiding metadata and game results without denying legitimate server actions.
- Use standard Playwright configuration and two opt-in temporary sessions for authenticated PvP regression tests; never store credentials in source.
- Load move history without catalog relationship embeds and enrich names separately; retired foreign keys must not hide moves or allow repeat observations in the UI.
- Interpret server search levels through a shared classifier and preserve the noisy flag; proximity hints must never stand in for the server's found-object result.
- Record exact pre/post-match Elo atomically in the existing finish handler; expose only completed match summaries through one shared profile history API, leaving legacy Elo deltas unknown.
- Daily question rewards and the featured player are computed only by security-definer RPCs; clients never write answers or bonus tokens directly, so the one-per-day limit cannot be bypassed.
- Search hint level 4 is never randomized (noise applies only below 4 and caps at 3), and furniture similarity ignores the universal 'breakable' tag; hints must stay meaningful.
- Coin balances, furniture, rooms and reward status are written only by security-definer RPCs (buy_furniture, buy_room, sell_reward_item); clients get no direct write path, so the economy cannot be forged.
- send-push accepts only the service role or a signed-in user targeting players who share a game with them; push must not be an open spam relay.
