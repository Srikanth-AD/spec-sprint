import type {
  Ticket,
  SprintPlan,
  DependencyGraph,
  SkillArea,
} from '../types.js'

export function planSprints(tickets: Ticket[], velocity: number): SprintPlan[] {
  const sorted = topoSort(tickets)
  const byId = new Map(tickets.map((t) => [t.id, t]))
  const assignedSprint = new Map<string, number>()

  let currentSprint = 1
  let remaining = velocity

  for (const t of sorted) {
    // earliest sprint allowed by deps
    let minSprint = 1
    for (const b of t.blockedBy) {
      const s = assignedSprint.get(b)
      if (s != null && s >= minSprint) minSprint = s
    }

    if (t.storyPoints > velocity) {
      // ticket too big — own sprint
      if (remaining < velocity) {
        currentSprint += 1
        remaining = velocity
      }
      const target = Math.max(currentSprint, minSprint)
      if (target > currentSprint) {
        currentSprint = target
        remaining = velocity
      }
      assignedSprint.set(t.id, currentSprint)
      t.sprint = currentSprint
      currentSprint += 1
      remaining = velocity
      continue
    }

    if (minSprint > currentSprint) {
      currentSprint = minSprint
      remaining = velocity
    }

    if (t.storyPoints > remaining) {
      currentSprint += 1
      remaining = velocity
      if (minSprint > currentSprint) {
        currentSprint = minSprint
      }
    }

    assignedSprint.set(t.id, currentSprint)
    t.sprint = currentSprint
    remaining -= t.storyPoints
  }

  // Build SprintPlan objects
  const sprintCount = Math.max(0, ...Array.from(assignedSprint.values()))
  const plans: SprintPlan[] = []
  const criticalPath = new Set(findCriticalPath(tickets))

  for (let n = 1; n <= sprintCount; n++) {
    const ids = tickets.filter((t) => t.sprint === n).map((t) => t.id)
    const ticketObjs = ids.map((id) => byId.get(id)!).filter(Boolean)
    const totalPoints = ticketObjs.reduce((s, t) => s + t.storyPoints, 0)
    const utilizationPct = velocity > 0 ? Math.round((totalPoints / velocity) * 100) : 0

    const skillBreakdown: Partial<Record<SkillArea, number>> = {}
    for (const t of ticketObjs) {
      skillBreakdown[t.skillArea] = (skillBreakdown[t.skillArea] ?? 0) + t.storyPoints
    }

    const warnings: string[] = []
    if (utilizationPct < 70) warnings.push('Sprint underutilized (< 70%)')
    if (utilizationPct > 95) warnings.push('Sprint very tight (> 95%)')
    for (const [skill, pts] of Object.entries(skillBreakdown)) {
      if ((pts ?? 0) > velocity * 0.6) {
        warnings.push(`${skill} area overloaded (${pts} of ${velocity} pts)`)
      }
    }
    for (const t of ticketObjs) {
      if (t.storyPoints === 13) {
        warnings.push(`Ticket ${t.id} is 13 points — consider splitting`)
      }
    }

    plans.push({
      sprintNumber: n,
      ticketIds: ids,
      totalPoints,
      capacityPoints: velocity,
      utilizationPct,
      skillBreakdown,
      criticalPathIds: ids.filter((id) => criticalPath.has(id)),
      warnings,
    })
  }

  return plans
}

function topoSort(tickets: Ticket[]): Ticket[] {
  const byId = new Map(tickets.map((t) => [t.id, t]))
  const indeg = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const t of tickets) {
    indeg.set(t.id, 0)
    adj.set(t.id, [])
  }
  for (const t of tickets) {
    for (const b of t.blockedBy) {
      if (!byId.has(b)) continue
      adj.get(b)!.push(t.id)
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1)
    }
  }

  // Priority order for ties: critical > high > medium > low, then larger points first
  const prioRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const ready: string[] = []
  for (const t of tickets) if ((indeg.get(t.id) ?? 0) === 0) ready.push(t.id)

  const sortReady = () => {
    ready.sort((a, b) => {
      const ta = byId.get(a)!
      const tb = byId.get(b)!
      const pa = prioRank[ta.priority] ?? 5
      const pb = prioRank[tb.priority] ?? 5
      if (pa !== pb) return pa - pb
      return tb.storyPoints - ta.storyPoints
    })
  }

  const out: Ticket[] = []
  while (ready.length) {
    sortReady()
    const id = ready.shift()!
    const t = byId.get(id)!
    out.push(t)
    for (const next of adj.get(id) ?? []) {
      indeg.set(next, (indeg.get(next) ?? 0) - 1)
      if ((indeg.get(next) ?? 0) === 0) ready.push(next)
    }
  }

  // Append any leftover (shouldn't happen after cycle removal)
  if (out.length < tickets.length) {
    for (const t of tickets) if (!out.includes(t)) out.push(t)
  }
  return out
}

export function findCriticalPath(tickets: Ticket[]): string[] {
  const byId = new Map(tickets.map((t) => [t.id, t]))
  // longest weighted path through DAG; weight = ticket.storyPoints
  // Use topo order
  const sorted = topoSort(tickets)
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  for (const t of sorted) {
    dist.set(t.id, t.storyPoints)
    prev.set(t.id, null)
  }
  for (const t of sorted) {
    for (const b of t.blockedBy) {
      const cand = (dist.get(b) ?? 0) + t.storyPoints
      if (cand > (dist.get(t.id) ?? 0)) {
        dist.set(t.id, cand)
        prev.set(t.id, b)
      }
    }
  }
  // find max
  let endId: string | null = null
  let maxD = -1
  for (const [id, d] of dist) {
    if (d > maxD) {
      maxD = d
      endId = id
    }
  }
  const path: string[] = []
  let cur = endId
  while (cur) {
    path.unshift(cur)
    cur = prev.get(cur) ?? null
  }
  return path
}

export function buildDependencyGraph(tickets: Ticket[]): DependencyGraph {
  const criticalPath = findCriticalPath(tickets)
  const cpSet = new Set(criticalPath)
  const nodes = tickets.map((t) => ({
    id: t.id,
    title: t.title,
    points: t.storyPoints,
    skillArea: t.skillArea,
    sprint: t.sprint,
    isCriticalPath: cpSet.has(t.id),
  }))
  const edges: Array<{ from: string; to: string }> = []
  for (const t of tickets) {
    for (const b of t.blockedBy) {
      edges.push({ from: b, to: t.id })
    }
  }
  return { nodes, edges, criticalPath }
}
