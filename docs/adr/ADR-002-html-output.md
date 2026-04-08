# ADR-002: Self-contained HTML output

## Context

spec-sprint produces a sprint plan from a product spec. We needed
to choose how to present that plan to the user.

## Decision

The primary output is a single self-contained HTML file with all
CSS and JavaScript inline. No external CDN dependencies. It opens
in any browser, works offline, and can be shared as an attachment.

## Alternatives Considered

- **PDF**: rejected. No interactivity, no copy buttons, harder to
  regenerate when plans change. EMs would have to re-run the tool
  every time they tweaked an estimate.
- **Terminal table**: rejected. Not shareable, not visual, harder
  to scan a 25-ticket plan with dependency relationships.
- **JSON only**: rejected as the primary output, though useful as
  a secondary export format for tooling integration.
- **Hosted web app**: rejected. Adds infrastructure and accounts;
  one of the explicit goals is zero infrastructure.

## Rationale

Engineering managers share sprint plans in meetings. HTML is the
universal viewer: it opens on a laptop, projects on a screen, can
be emailed or dropped into Slack. Interactive elements (the
dependency graph, copy buttons, ticket modal) make the report
something you actually use during planning, not just a dead artifact.

## Consequences

- The HTML template is the product surface. It must be polished
  enough to present in a planning meeting on first run.
- We trade printability for interactivity, but EMs do not print
  sprint plans.
- The single-file constraint means no build step for the template,
  no asset pipeline, and no version skew between bundles.
