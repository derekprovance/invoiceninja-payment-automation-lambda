import { readFileSync } from 'fs'
import { resolve } from 'path'

// Resolve integration env file relative to project root
const envFile = resolve(
  process.cwd(),
  'docker/integration.env',
)

let raw: string
try {
  raw = readFileSync(envFile, 'utf8')
} catch {
  throw new Error(
    `Integration env file not found at ${envFile}.\n` +
      'Run `make integration:start` to start Invoice Ninja and generate this file.',
  )
}

for (const line of raw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq)
  const value = trimmed.slice(eq + 1)
  process.env[key] = value
}

// Map to the names that config.ts requires
process.env.BASE_URL = process.env.IN_BASE_URL
process.env.TOKEN = process.env.IN_TOKEN
process.env.VENMO_EMAIL = 'venmo@venmo.com'
// Type ID 1 (Credit Card) is always seeded in a fresh Invoice Ninja install.
// Production uses 25 (Venmo), but any valid type ID works for integration testing.
process.env.VENMO_PAYMENT_GATEWAY_ID = '1'
process.env.LOG_LEVEL = 'silent'
