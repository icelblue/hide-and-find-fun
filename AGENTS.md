# Architecture rules

- Use the April 26, 2026 UI snapshot as the recovery baseline; retain current managed Cloud integration and applied migrations because reverting code must not revert player data or security.
- Keep authentication hydration, lazy-module recovery and error-report throttling from the current implementation because historical UI recovery must not reintroduce known loading failures.
- Later unused modules/assets remain available but personal-space routes are not exposed by this recovery; avoid destructive cleanup while compatibility is being validated.
