# Contributing to spec-sprint

Thanks for your interest. spec-sprint is a small, focused tool — the
contribution surface is intentionally narrow.

## Local setup

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/spec-sprint
cd spec-sprint
npm install
npm run dev
```

`npm run dev` watches `src/` and rebuilds `dist/` on every change.

## Manual test

The cheapest, fastest end-to-end test:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node dist/index.js generate examples/sso-auth.md \
  --team 4 --velocity 32 --team-name "Auth Squad"
```

The SSO spec is short and decomposes quickly, so it's the right one
for iteration. Use `examples/guest-checkout.md` for richer dependency
graphs and screenshot-worthy output.

After it runs, verify in the generated HTML report:

- Sprint cards render and the utilization bar colors look right.
- The dependency graph draws nodes and arrows between sprints.
- Hovering a node dims the rest and highlights its connections.
- Clicking any ticket ID or title opens the ticket detail modal.
- All three copy buttons work (visual ✓ on success).
- The sprint-level "Markdown table" and "Slack summary" buttons
  produce well-formed text.

## Pull requests

- One change per PR. Don't bundle a refactor with a feature.
- Describe what changed and why. The "why" matters more than the "what".
- If the PR changes architecture, add or update an ADR in `docs/adr/`.

## Where to contribute

Areas that benefit from contribution:

- HTML template polish (typography, dependency graph layout, mobile)
- Estimation prompt tuning — better decomposition rules, fewer trivial tickets
- New output formats (e.g. CSV export, GitHub Issues format)
- Additional example specs that exercise different domain shapes
- Bug fixes — especially around the dependency planner's edge cases

Areas to avoid without discussion first:

- Adding hosted/account features (zero infrastructure is a goal)
- Replacing the single-file HTML output (see ADR-002)
- Switching the estimation scale away from Fibonacci (see ADR-001)

## ADRs

If your change makes a non-trivial architectural decision, write an
ADR in `docs/adr/` following the format of the existing ones:
context, decision, rationale, consequences. Short is fine.
