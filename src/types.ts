export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13

export type SkillArea =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'data'
  | 'infra'
  | 'qa'
  | 'design'

export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface AcceptanceCriterion {
  given: string
  when: string
  then: string
}

export interface Ticket {
  id: string
  type: 'epic' | 'story' | 'task'
  epicId: string | null
  title: string
  userStory: string
  description: string
  acceptanceCriteria: AcceptanceCriterion[]
  storyPoints: StoryPoints
  skillArea: SkillArea
  priority: Priority
  blockedBy: string[]
  blocks: string[]
  sprint: number | null
  rationale: string
}

export interface Epic {
  id: string
  title: string
  description: string
  ticketIds: string[]
  totalPoints: number
  sprintSpan: number
}

export interface SprintPlan {
  sprintNumber: number
  ticketIds: string[]
  totalPoints: number
  capacityPoints: number
  utilizationPct: number
  skillBreakdown: Partial<Record<SkillArea, number>>
  criticalPathIds: string[]
  warnings: string[]
}

export interface DependencyGraph {
  nodes: Array<{
    id: string
    title: string
    points: StoryPoints
    skillArea: SkillArea
    sprint: number | null
    isCriticalPath: boolean
  }>
  edges: Array<{ from: string; to: string }>
  criticalPath: string[]
}

export interface DecompositionResult {
  specSummary: string
  epics: Epic[]
  tickets: Ticket[]
  totalPoints: number
  recommendedSprints: number
  assumptions: string[]
  risks: string[]
}

export interface Config {
  teamSize: number
  velocity: number
  sprintDays: number
  sprintName?: string
  teamName?: string
  skills: SkillArea[]
  anthropicApiKey: string
  model: string
}

export interface ReportData {
  specSource: string
  specText: string
  config: Config
  decomposition: DecompositionResult
  sprintPlans: SprintPlan[]
  dependencyGraph: DependencyGraph
  generatedAt: string
  version: string
}
