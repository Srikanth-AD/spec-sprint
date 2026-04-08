import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import open from 'open'
import fs from 'fs/promises'
import path from 'path'
import { loadSpec } from '../lib/specLoader.js'
import { decomposeSpec } from '../lib/decomposer.js'
import {
  planSprints,
  buildDependencyGraph,
} from '../lib/capacityPlanner.js'
import { renderReport } from '../lib/renderer.js'
import { renderMarkdownReport } from '../lib/markdownRenderer.js'
import { getApiKey, DEFAULT_MODEL, VERSION } from '../lib/config.js'
import type { Config, ReportData, SkillArea } from '../types.js'

const ALL_SKILLS: SkillArea[] = [
  'frontend',
  'backend',
  'fullstack',
  'data',
  'infra',
  'qa',
  'design',
]

export function registerGenerate(program: Command): void {
  program
    .command('generate')
    .description(
      'Decompose a product spec into sprint-ready tickets and generate an HTML report'
    )
    .argument('<spec>', 'Path to spec file, HTTPS URL, or inline text in quotes')
    .option('-t, --team <number>', 'Number of engineers (required)')
    .option('-v, --velocity <number>', 'Story points per sprint (required)')
    .option('-d, --days <number>', 'Working days per sprint', '10')
    .option('--sprint-name <name>', 'Sprint name, e.g. "Q2 Sprint 1"')
    .option('--team-name <name>', 'Team name, e.g. "Platform Team"')
    .option(
      '--skills <list>',
      'Comma-separated skill areas',
      ALL_SKILLS.join(',')
    )
    .option('-o, --output <path>', 'Output HTML file path')
    .option('--no-open', "Don't open in browser after generation")
    .action(async (spec: string, opts: any) => {
      await runGenerate(spec, opts)
    })
}

async function runGenerate(spec: string, opts: any): Promise<void> {
  const team = parseInt(opts.team, 10)
  const velocity = parseInt(opts.velocity, 10)
  const days = parseInt(opts.days, 10) || 10

  if (!opts.team || !opts.velocity || isNaN(team) || isNaN(velocity) || team <= 0 || velocity <= 0) {
    console.error(
      chalk.red('\n✗ spec-sprint: --team and --velocity are required positive integers\n')
    )
    console.error('  Example:')
    console.error(
      '    spec-sprint generate ./spec.md --team 6 --velocity 44\n'
    )
    process.exit(1)
  }

  const apiKey = getApiKey()

  const skills = String(opts.skills)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is SkillArea => (ALL_SKILLS as string[]).includes(s))

  const config: Config = {
    teamSize: team,
    velocity,
    sprintDays: days,
    sprintName: opts.sprintName,
    teamName: opts.teamName,
    skills: skills.length ? skills : ALL_SKILLS,
    anthropicApiKey: apiKey,
    model: DEFAULT_MODEL,
  }

  const spinner = ora('Loading spec...').start()
  const { text, resolvedSource } = await loadSpec(spec)
  spinner.succeed(
    `Spec: ${chalk.cyan(resolvedSource)} (${text.length} chars)`
  )

  console.log(
    chalk.dim(
      '  This will use approximately $0.05–0.20 of Anthropic API credits'
    )
  )

  spinner.start('Decomposing with Claude Sonnet...')
  const decomposition = await decomposeSpec(text, config)
  spinner.succeed(
    `Decomposed: ${decomposition.tickets.length} tickets across ${decomposition.epics.length} epics`
  )

  spinner.start('Planning sprints...')
  const sprintPlans = planSprints(decomposition.tickets, velocity)
  const dependencyGraph = buildDependencyGraph(decomposition.tickets)
  spinner.succeed(`Planned ${sprintPlans.length} sprints`)

  spinner.start('Generating report...')
  const outputPath = await chooseOutputPath(opts.output)
  const reportData: ReportData = {
    specSource: resolvedSource,
    specText: text,
    config: { ...config, anthropicApiKey: '' },
    decomposition,
    sprintPlans,
    dependencyGraph,
    generatedAt: new Date().toISOString(),
    version: VERSION,
  }
  if (outputPath.toLowerCase().endsWith('.md')) {
    await renderMarkdownReport(reportData, outputPath)
  } else {
    await renderReport(reportData, outputPath)
  }
  spinner.succeed(`Report written to ${chalk.cyan(outputPath)}`)

  printSummary(reportData, outputPath)

  if (opts.open !== false) {
    try {
      await open(outputPath)
    } catch {
      // ignore — file is still on disk
    }
  }
}

async function chooseOutputPath(explicit?: string): Promise<string> {
  if (explicit) return path.resolve(explicit)
  const date = new Date().toISOString().slice(0, 10)
  const base = `spec-sprint-${date}`
  let candidate = path.resolve(`${base}.html`)
  let i = 2
  while (await exists(candidate)) {
    candidate = path.resolve(`${base}-${i}.html`)
    i += 1
  }
  return candidate
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

function printSummary(data: ReportData, outputPath: string): void {
  const { decomposition, sprintPlans, config, dependencyGraph } = data
  const ticketCount = decomposition.tickets.length
  const epicCount = decomposition.epics.length
  const sprintCount = sprintPlans.length
  const totalPoints = decomposition.totalPoints

  console.log('')
  console.log(chalk.green('✓ spec-sprint complete'))
  console.log('')
  console.log(`  Spec:     ${data.specSource}`)
  console.log(`  Tickets:  ${ticketCount} stories across ${epicCount} epics`)
  console.log(`  Sprints:  ${sprintCount} (${totalPoints} total points)`)
  console.log(
    `  Team:     ${config.teamSize} engineers @ ${config.velocity} pts/sprint`
  )
  console.log('')
  console.log('  Sprint breakdown:')
  sprintPlans.forEach((p, i) => {
    const last = i === sprintPlans.length - 1
    const branch = last ? '└─' : '├─'
    const warn =
      p.warnings.length > 0
        ? chalk.yellow(`  ⚠ ${p.warnings.length} warning(s)`)
        : ''
    console.log(
      `    ${branch} Sprint ${p.sprintNumber}: ${p.totalPoints}/${p.capacityPoints} pts (${p.utilizationPct}%)${warn}`
    )
  })
  console.log('')
  const cpPts = dependencyGraph.criticalPath.reduce((s, id) => {
    const t = decomposition.tickets.find((x) => x.id === id)
    return s + (t?.storyPoints ?? 0)
  }, 0)
  if (dependencyGraph.criticalPath.length) {
    console.log(
      `  Critical path: ${dependencyGraph.criticalPath.join(' → ')} (${cpPts} pts)`
    )
  }
  const totalWarnings = sprintPlans.reduce((s, p) => s + p.warnings.length, 0)
  if (totalWarnings > 0) {
    console.log(
      chalk.yellow(`  Warnings: ${totalWarnings} — see report for details`)
    )
  }
  console.log('')
  console.log(`  Report: ${chalk.cyan(outputPath)}`)
  console.log('')
}
