# ADR-003: Team capacity is a required input

## Context

Existing spec-to-task tools (Kiro, Spec Kit, BMAD, and similar) treat
team capacity as either an afterthought or a separate manual step.
They produce flat task lists and leave it to the user to figure out
what fits where.

## Decision

`--team` and `--velocity` are required flags on `spec-sprint generate`.
The tool will not run without them. Tickets are assigned to specific
sprints based on team velocity and dependency ordering, not just
emitted as a flat list.

## Rationale

A task list that ignores velocity is not a sprint plan. The core
value of spec-sprint is producing something an engineering manager
can walk into a planning meeting with — and that requires:

- Fitting work into real team capacity (velocity).
- Respecting dependency order (a ticket cannot land in a sprint
  before its blockers).
- Surfacing skill-area pressure (8 backend points stuffed into a
  3-engineer team where only one is backend is a planning failure).

Treating capacity as optional would put spec-sprint in the same
category as everything else that already exists. Making it required
forces the output to be qualitatively different.

## Consequences

- Slightly more friction at the CLI: users must provide two flags
  on every run. We accept this in exchange for more useful output.
- We can produce sprint-by-sprint utilization warnings (under-planned,
  overloaded, skill imbalance), which is one of the most-cited
  features in early feedback.
- The generated report is meaningfully different from a flat task
  dump. That difference is the product.
