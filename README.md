# spec-sprint

> Turn a product spec into sprint-ready Jira/Linear tickets
> with capacity planning — in 60 seconds.

## The problem

PM drops a spec in Slack. Sprint planning is in two hours. You need
to decompose it into engineering tickets, estimate them, figure out
what depends on what, check it actually fits your team's velocity,
and have something to walk into the meeting with that isn't a wall
of text.

Today you do this by hand. It takes two or three focused hours,
usually rushed, and the estimates are educated guesses you'll defend
in the meeting anyway. By the time you finish, half your team is
waiting on you and you still haven't read your inbox.

`spec-sprint` does it in sixty seconds. Give it the spec and your
team's capacity. It hands back an interactive HTML report with
sprint-ready tickets, a dependency graph, sprint-by-sprint
utilization warnings, and one-click copy buttons for Jira, Linear,
or plain text. You walk into planning with a structured proposal
your team can react to instead of a blank doc.

## Quickstart

```bash
npm install -g spec-sprint
export ANTHROPIC_API_KEY=sk-ant-...
spec-sprint generate ./my-feature-spec.md --team 6 --velocity 44
```

The HTML report opens automatically in your browser.

## See it in action

Two example specs and the reports they produced are checked into this
repo. Open the HTML files locally to click around — copy buttons,
dependency graph hover, ticket modal, and all.

| Spec | Team / Velocity | Output | Result |
|---|---|---|---|
| [`examples/sso-auth.md`](examples/sso-auth.md) | 4 engineers @ 32 pts | [`examples/output/sso-auth.html`](examples/output/sso-auth.html) | 20 tickets · 7 epics · 3 sprints · 77 pts |
| [`examples/guest-checkout.md`](examples/guest-checkout.md) | 6 engineers @ 44 pts | [`examples/output/guest-checkout.html`](examples/output/guest-checkout.html) | 28 tickets · 8 epics · 3 sprints · 109 pts |

To regenerate them yourself:

```bash
spec-sprint generate examples/sso-auth.md \
  --team 4 --velocity 32 \
  --team-name "Auth Squad" --sprint-name "Q2 Sprint 1" \
  --output examples/output/sso-auth.html

spec-sprint generate examples/guest-checkout.md \
  --team 6 --velocity 44 \
  --team-name "Checkout Team" --sprint-name "Q2 Sprint 1" \
  --output examples/output/guest-checkout.html
```

## What the report contains

- **Header stats**: ticket count, total points, sprint count, team capacity
- **Spec summary** with a "view full spec" toggle
- **Warnings panel** for any sprint that's underutilized, overloaded,
  or skill-imbalanced
- **Assumptions and risks** the AI flagged from the spec
- **Sprint overview cards** with utilization bars and skill breakdown
- **Interactive dependency graph** (column-per-sprint layout, hover to
  highlight, click to open ticket details)
- **Per-sprint ticket tables** with copy buttons for every ticket
- **Sprint-level copy buttons** for Jira import, Markdown table, and
  Slack-pasteable summary
- **Ticket detail modal** with full user story, acceptance criteria,
  blockers, and rationale

## CLI options

```
spec-sprint generate <spec> [options]

Arguments:
  spec                Path to spec file, HTTPS URL, or inline text in quotes

Options:
  -t, --team <n>      Number of engineers (required)
  -v, --velocity <n>  Story points per sprint (required)
  -d, --days <n>      Working days per sprint (default: 10)
  --sprint-name <s>   Sprint name, e.g. "Q2 Sprint 1"
  --team-name <s>     Team name, e.g. "Platform Team"
  --skills <list>     Comma-separated skill areas (default: all)
  -o, --output <p>    Output HTML file path
  --no-open           Don't open the report in your browser
```

Examples:

```bash
# From a local file
spec-sprint generate ./specs/checkout.md --team 5 --velocity 35

# From a URL
spec-sprint generate https://example.com/spec.html --team 4 --velocity 32

# Inline text
spec-sprint generate "Build a TODO app with auth..." --team 3 --velocity 24

# Named sprint, restricted skills
spec-sprint generate ./spec.md \
  --team 6 --velocity 44 \
  --team-name "Platform" --sprint-name "Q2 S1" \
  --skills backend,frontend,qa
```

## On estimation accuracy

AI-generated story points are a starting point, not a commitment.
Expect to adjust 30–40% of estimates in your planning session — that's
the point. You're reacting to a structured proposal instead of starting
from a blank document. The tool's job is to get you 80% of the way to
a plan in sixty seconds; the last 20% is your team's call, where it
should be.

## Copy button formats

Every ticket has three copy buttons. Each format is plain text you
can paste anywhere.

- **Jira**: Multi-section format with User Story, Description,
  Acceptance Criteria, Story Points, Skill Area, Priority, and rationale.
  Pastes cleanly into a Jira issue body.
- **Linear**: Compact format with the user story up top, GFM-style
  acceptance criteria checkboxes, and a single metadata line.
  Pastes cleanly into a Linear issue body.
- **Plain**: Single ticket as compact plain text. Good for Slack,
  email, or planning docs.

Each sprint also has three sprint-level buttons: all tickets concatenated
in Jira format, a Markdown table for docs, and a Slack-formatted summary
with the critical path called out.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Architectural decisions live
in [docs/adr/](docs/adr/).

## License

MIT.
