import { describe, it, expect } from 'vitest'
import {
  planSprints,
  buildDependencyGraph,
  findCriticalPath,
} from '../src/lib/capacityPlanner.js'
import type { Ticket, StoryPoints, SkillArea, Priority } from '../src/types.js'

function makeTicket(
  id: string,
  storyPoints: StoryPoints,
  blockedBy: string[] = [],
  skillArea: SkillArea = 'backend',
  priority: Priority = 'medium'
): Ticket {
  return {
    id,
    type: 'story',
    epicId: null,
    title: `Ticket ${id}`,
    userStory: `As a user, I want ${id}`,
    description: 'desc',
    acceptanceCriteria: [],
    storyPoints,
    skillArea,
    priority,
    blockedBy,
    blocks: [],
    sprint: null,
    rationale: 'because',
  }
}

describe('planSprints', () => {
  it('assigns all tickets to sprints', () => {
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 5),
      makeTicket('C', 2),
    ]
    const plans = planSprints(tickets, 20)
    const assigned = plans.flatMap((p) => p.ticketIds)
    expect(assigned.sort()).toEqual(['A', 'B', 'C'])
  })

  it('respects dependency order — blockers come before dependents', () => {
    const tickets = [
      makeTicket('A', 5),
      makeTicket('B', 5, ['A']),
      makeTicket('C', 5, ['B']),
    ]
    const plans = planSprints(tickets, 5)
    const sprintOf = (id: string) =>
      plans.find((p) => p.ticketIds.includes(id))!.sprintNumber
    expect(sprintOf('A')).toBeLessThan(sprintOf('B'))
    expect(sprintOf('B')).toBeLessThan(sprintOf('C'))
  })

  it('packs tickets into a sprint up to velocity', () => {
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 3),
      makeTicket('C', 2),
    ]
    const plans = planSprints(tickets, 8)
    expect(plans.length).toBe(1)
    expect(plans[0].totalPoints).toBe(8)
    expect(plans[0].utilizationPct).toBe(100)
  })

  it('opens a new sprint when capacity is exceeded', () => {
    // 3 × 5pt at velocity 8 — only one fits per sprint (5+5=10 > 8)
    const tickets = [
      makeTicket('A', 5),
      makeTicket('B', 5),
      makeTicket('C', 5),
    ]
    const plans = planSprints(tickets, 8)
    expect(plans.length).toBe(3)
    expect(plans.every((p) => p.totalPoints === 5)).toBe(true)
  })

  it('packs multiple small tickets into one sprint', () => {
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 3),
      makeTicket('C', 3),
    ]
    const plans = planSprints(tickets, 8)
    expect(plans.length).toBe(2)
    expect(plans[0].totalPoints).toBe(6)
    expect(plans[1].totalPoints).toBe(3)
  })

  it('places oversized tickets (> velocity) in their own sprint', () => {
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 13),
      makeTicket('C', 2),
    ]
    const plans = planSprints(tickets, 8)
    const big = plans.find((p) => p.ticketIds.includes('B'))!
    expect(big.ticketIds).toEqual(['B'])
    expect(big.totalPoints).toBe(13)
  })

  it('computes utilization, skill breakdown, and warnings', () => {
    const tickets = [
      makeTicket('A', 5, [], 'backend'),
      makeTicket('B', 3, [], 'frontend'),
    ]
    const plans = planSprints(tickets, 10)
    expect(plans[0].totalPoints).toBe(8)
    expect(plans[0].utilizationPct).toBe(80)
    expect(plans[0].skillBreakdown.backend).toBe(5)
    expect(plans[0].skillBreakdown.frontend).toBe(3)
  })

  it('warns when a sprint is underutilized', () => {
    const tickets = [makeTicket('A', 3)]
    const plans = planSprints(tickets, 20)
    expect(plans[0].warnings.some((w) => w.includes('underutilized'))).toBe(true)
  })

  it('warns when a sprint is very tight', () => {
    const tickets = [makeTicket('A', 5), makeTicket('B', 5)]
    const plans = planSprints(tickets, 10)
    expect(plans[0].warnings.some((w) => w.includes('tight'))).toBe(true)
  })

  it('warns about 13-point tickets', () => {
    const tickets = [makeTicket('A', 13)]
    const plans = planSprints(tickets, 13)
    expect(plans[0].warnings.some((w) => w.includes('13 points'))).toBe(true)
  })

  it('warns when a single skill area is overloaded', () => {
    const tickets = [
      makeTicket('A', 5, [], 'backend'),
      makeTicket('B', 5, [], 'backend'),
    ]
    const plans = planSprints(tickets, 13)
    expect(
      plans[0].warnings.some((w) => w.toLowerCase().includes('backend'))
    ).toBe(true)
  })
})

describe('findCriticalPath', () => {
  it('returns empty path when there are no tickets', () => {
    expect(findCriticalPath([])).toEqual([])
  })

  it('finds the longest weighted path through a DAG', () => {
    // A(3) -> B(5) -> D(2) | A(3) -> C(8) -> D(2)
    // longest: A -> C -> D = 13
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 5, ['A']),
      makeTicket('C', 8, ['A']),
      makeTicket('D', 2, ['B', 'C']),
    ]
    const path = findCriticalPath(tickets)
    expect(path).toEqual(['A', 'C', 'D'])
  })

  it('returns a single ticket as its own path when there are no deps', () => {
    const tickets = [makeTicket('A', 8), makeTicket('B', 3)]
    const path = findCriticalPath(tickets)
    // longest single ticket is A (8)
    expect(path).toEqual(['A'])
  })
})

describe('buildDependencyGraph', () => {
  it('builds nodes and edges from blockedBy relationships', () => {
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 5, ['A']),
    ]
    const graph = buildDependencyGraph(tickets)
    expect(graph.nodes.length).toBe(2)
    expect(graph.edges).toEqual([{ from: 'A', to: 'B' }])
  })

  it('marks critical path nodes', () => {
    const tickets = [
      makeTicket('A', 3),
      makeTicket('B', 5, ['A']),
    ]
    const graph = buildDependencyGraph(tickets)
    const a = graph.nodes.find((n) => n.id === 'A')!
    const b = graph.nodes.find((n) => n.id === 'B')!
    expect(a.isCriticalPath).toBe(true)
    expect(b.isCriticalPath).toBe(true)
  })
})
