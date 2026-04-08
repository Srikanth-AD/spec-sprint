export function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    console.error(`
✗ spec-sprint: ANTHROPIC_API_KEY not set

  Get a key at: https://console.anthropic.com
  Then run:     export ANTHROPIC_API_KEY=sk-ant-...
`)
    process.exit(1)
  }
  return key
}

export const DEFAULT_MODEL = 'claude-sonnet-4-6'
export const VERSION = '0.1.0'
