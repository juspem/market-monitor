# Market Analysis Project Instructions

## Project goal
Build a lightweight market dashboard for quickly reviewing broad market conditions, index relationships, relative strength, and normalized performance.

## Technology direction
- Use React and TypeScript.
- Use Lightweight Charts for interactive charts.
- Keep market-data access, calculations, and chart rendering separate.
- Prefer small, testable modules over broad components.

## Domain rules
- Treat timestamps and exchange time zones as first-class data.
- Do not compare or divide observations with mismatched trading dates without an explicit policy.
- Mark stale, delayed, incomplete, or unavailable data clearly in the UI.
- Test financial calculations independently from chart rendering.
- Never commit API keys, tokens, or personal credentials.

## Engineering rules
- Preserve existing public APIs unless a change is required.
- Avoid adding dependencies without a concrete reason.
- Validate focused behavior after every substantive edit.
- Keep UI responsive in a small desktop window.
- Use ASCII in source files unless a non-ASCII character is required by the product.
- Do not make unrelated refactors.
