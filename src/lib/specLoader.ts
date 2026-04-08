import fs from 'fs/promises'
import path from 'path'

export async function loadSpec(source: string): Promise<{
  text: string
  resolvedSource: string
}> {
  let text: string
  let resolvedSource: string

  if (source.startsWith('https://') || source.startsWith('http://')) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      const res = await fetch(source, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        console.error(`\n✗ spec-sprint: failed to fetch ${source} (HTTP ${res.status})\n`)
        process.exit(1)
      }
      const html = await res.text()
      text = stripHtml(html).trim()
      resolvedSource = source
    } catch (err: any) {
      console.error(`\n✗ spec-sprint: could not fetch ${source}\n  ${err?.message ?? err}\n`)
      process.exit(1)
    }
  } else if (
    source.endsWith('.md') ||
    source.endsWith('.txt') ||
    source.includes(path.sep) ||
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('/')
  ) {
    try {
      const abs = path.resolve(source)
      text = await fs.readFile(abs, 'utf-8')
      resolvedSource = abs
    } catch (err: any) {
      console.error(`\n✗ spec-sprint: could not read file ${source}\n  ${err?.message ?? err}\n`)
      process.exit(1)
    }
  } else {
    text = source
    resolvedSource = 'inline'
  }

  if (text.length < 100) {
    console.error(`
✗ spec-sprint: spec is too short to decompose
  Got ${text.length} characters. Provide at least a few sentences.
`)
    process.exit(1)
  }

  return { text, resolvedSource }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
}
