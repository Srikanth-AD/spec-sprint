import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type {
  Config,
  DecompositionResult,
  Epic,
  Ticket,
  StoryPoints,
} from '../types.js'

const FIB: StoryPoints[] = [1, 2, 3, 5, 8, 13]

export async function decomposeSpec(
  specText: string,
  config: Config
): Promise<DecompositionResult> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey })

  const system = `You are an experienced engineering manager breaking down a product
specification into sprint-ready engineering tickets for a human team.

Rules you must follow:
- Write tickets for human engineers, not AI coding agents
- User stories: "As a [persona], I want [X] so that [Y]"
- Acceptance criteria: Given/When/Then format, 2-4 per story
- Story points: Fibonacci only — 1, 2, 3, 5, 8, 13
  1pt = ~half day | 2pt = ~1 day | 3pt = ~1.5 days
  5pt = ~2.5 days | 8pt = ~4 days | 13pt = ~1 week+
- Skill areas: frontend, backend, fullstack, data, infra, qa, design
- Dependencies must be logical (data model before API, API before UI,
  auth before protected routes, schema before migrations, etc.)
- Group related stories into epics
- Flag assumptions and risks honestly
- Minimum story: 1 point of meaningful work
- Do not generate trivial tasks like "create a file" or "init repo"
- Each story should deliver identifiable business or technical value

The team context:
- Team size: ${config.teamSize} engineers
- Sprint velocity: ${config.velocity} story points per ${config.sprintDays}-day sprint
- Available skills: ${config.skills.join(', ')}

Respond ONLY with valid JSON matching the schema below.
No markdown fences. No explanation before or after the JSON.`

  const user = `PRODUCT SPECIFICATION:
${specText}

Decompose this into epics and stories. Respond with JSON:
{
  "specSummary": "2-3 sentence summary of what is being built",
  "epics": [
    {
      "id": "EP-1",
      "title": "Epic title",
      "description": "What this epic covers in one sentence"
    }
  ],
  "tickets": [
    {
      "id": "SS-1",
      "type": "story",
      "epicId": "EP-1",
      "title": "Short descriptive title",
      "userStory": "As a [persona], I want [X] so that [Y]",
      "description": "2-3 sentences of context for the engineer",
      "acceptanceCriteria": [
        { "given": "...", "when": "...", "then": "..." }
      ],
      "storyPoints": 3,
      "skillArea": "backend",
      "priority": "high",
      "blockedBy": [],
      "rationale": "One sentence explaining the point estimate"
    }
  ],
  "assumptions": ["Assumption 1", "Assumption 2"],
  "risks": ["Risk 1", "Risk 2"]
}`

  let raw: string
  try {
    const resp = await client.messages.create({
      model: config.model,
      max_tokens: 16_000,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const block = resp.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') {
      throw new Error('No text block in API response')
    }
    raw = block.text
  } catch (err: any) {
    const status = err?.status ? ` (HTTP ${err.status})` : ''
    console.error(`\n✗ spec-sprint: Anthropic API error${status}\n  ${err?.message ?? err}\n`)
    process.exit(1)
  }

  let parsed: any
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    parsed = JSON.parse(cleaned)
  } catch (err: any) {
    await writeDebugLog(raw)
    console.error(
      `\n✗ spec-sprint: could not parse Claude's response as JSON.\n  Raw response saved to ~/.spec-sprint/debug.log\n`
    )
    process.exit(1)
  }

  return postProcess(parsed, config)
}

async function writeDebugLog(content: string): Promise<void> {
  try {
    const dir = path.join(os.homedir(), '.spec-sprint')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'debug.log'), content, 'utf-8')
  } catch {
    // best effort
  }
}

function snapPoints(n: any): StoryPoints {
  const num = Number(n) || 1
  let best: StoryPoints = 1
  let bestDiff = Infinity
  for (const f of FIB) {
    const d = Math.abs(f - num)
    if (d < bestDiff) {
      bestDiff = d
      best = f
    }
  }
  return best
}

function postProcess(parsed: any, config: Config): DecompositionResult {
  const tickets: Ticket[] = (parsed.tickets ?? []).map((t: any) => ({
    id: String(t.id),
    type: t.type ?? 'story',
    epicId: t.epicId ?? null,
    title: String(t.title ?? 'Untitled'),
    userStory: String(t.userStory ?? ''),
    description: String(t.description ?? ''),
    acceptanceCriteria: Array.isArray(t.acceptanceCriteria)
      ? t.acceptanceCriteria.map((ac: any) => ({
          given: String(ac.given ?? ''),
          when: String(ac.when ?? ''),
          then: String(ac.then ?? ''),
        }))
      : [],
    storyPoints: snapPoints(t.storyPoints),
    skillArea: t.skillArea ?? 'backend',
    priority: t.priority ?? 'medium',
    blockedBy: Array.isArray(t.blockedBy) ? t.blockedBy.map(String) : [],
    blocks: [],
    sprint: null,
    rationale: String(t.rationale ?? ''),
  }))

  const ids = new Set(tickets.map((t) => t.id))
  for (const t of tickets) {
    t.blockedBy = t.blockedBy.filter((b) => ids.has(b) && b !== t.id)
  }

  // Detect & break circular dependencies
  removeCycles(tickets)

  // Derive blocks
  const byId = new Map(tickets.map((t) => [t.id, t]))
  for (const t of tickets) {
    for (const b of t.blockedBy) {
      const blocker = byId.get(b)
      if (blocker && !blocker.blocks.includes(t.id)) {
        blocker.blocks.push(t.id)
      }
    }
  }

  const epics: Epic[] = (parsed.epics ?? []).map((e: any) => {
    const ticketIds = tickets.filter((t) => t.epicId === e.id).map((t) => t.id)
    const totalPoints = tickets
      .filter((t) => t.epicId === e.id)
      .reduce((s, t) => s + t.storyPoints, 0)
    return {
      id: String(e.id),
      title: String(e.title ?? 'Untitled Epic'),
      description: String(e.description ?? ''),
      ticketIds,
      totalPoints,
      sprintSpan: Math.max(1, Math.ceil(totalPoints / config.velocity)),
    }
  })

  const totalPoints = tickets.reduce((s, t) => s + t.storyPoints, 0)
  const recommendedSprints = Math.max(1, Math.ceil(totalPoints / config.velocity))

  return {
    specSummary: String(parsed.specSummary ?? ''),
    epics,
    tickets,
    totalPoints,
    recommendedSprints,
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
  }
}

function removeCycles(tickets: Ticket[]): void {
  const byId = new Map(tickets.map((t) => [t.id, t]))
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2
  const color = new Map<string, number>()
  for (const t of tickets) color.set(t.id, WHITE)

  function dfs(id: string): void {
    color.set(id, GRAY)
    const t = byId.get(id)
    if (!t) return
    for (const dep of [...t.blockedBy]) {
      const c = color.get(dep)
      if (c === GRAY) {
        // remove cycle edge
        t.blockedBy = t.blockedBy.filter((b) => b !== dep)
        console.error(
          `⚠ Circular dependency detected: ${dep} ↔ ${id} — removing ${id} → ${dep}`
        )
      } else if (c === WHITE) {
        dfs(dep)
      }
    }
    color.set(id, BLACK)
  }

  for (const t of tickets) {
    if (color.get(t.id) === WHITE) dfs(t.id)
  }
}
