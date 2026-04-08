import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ReportData } from '../types.js'

export async function renderReport(
  data: ReportData,
  outputPath: string
): Promise<void> {
  const templatePath = await resolveTemplatePath()
  const template = await fs.readFile(templatePath, 'utf-8')
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  const injected = template.replace(
    'SPEC_SPRINT_DATA_PLACEHOLDER',
    `window.SPEC_SPRINT_DATA = ${json};`
  )
  await fs.writeFile(outputPath, injected, 'utf-8')
}

async function resolveTemplatePath(): Promise<string> {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '../templates/report.html'),
    path.resolve(here, '../../templates/report.html'),
    path.resolve(here, './templates/report.html'),
  ]
  for (const c of candidates) {
    try {
      await fs.access(c)
      return c
    } catch {}
  }
  return candidates[0]
}
