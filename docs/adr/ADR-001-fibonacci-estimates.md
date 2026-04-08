# ADR-001: Fibonacci-only story point estimates

## Context

spec-sprint generates story point estimates for AI-decomposed tickets.
We needed to choose a scale for those estimates.

## Decision

We use the Fibonacci sequence (1, 2, 3, 5, 8, 13) only. No other
values are accepted. Anything the AI returns outside this set is
snapped to the nearest Fibonacci value.

## Rationale

- Fibonacci is the industry standard for relative estimation in
  Jira, Linear, and most other agile tools. Output drops directly
  into existing planning workflows with no translation step.
- The widening gaps force engineers to think in terms of relative
  complexity rather than false precision (the difference between
  "8" and "13" is meaningful in a way that "9" and "10" never are).
- It maps well to a small fixed set of UI affordances (color-coded
  badges) in the HTML report.

## Consequences

- AI-generated estimates will be wrong roughly 30–40% of the time.
  This is expected and not a flaw.
- The value spec-sprint provides is a structured starting point
  for a planning conversation, not a final commitment.
- Users who prefer t-shirt sizes or hours will need to translate.
  We accept that tradeoff in exchange for tool compatibility.
