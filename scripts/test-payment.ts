import { config } from 'dotenv'
import { buildVenmoSesEvent, createMockContext } from '../src/tests/integration/helpers/sesEventFactory'

// Must run before dynamic import of '../index', because config.ts calls
// requireEnv() at module evaluation time.
config();

const main = async () => {
  const args = process.argv.slice(2)
  const nameIdx = args.indexOf('--name')
  const amountIdx = args.indexOf('--amount')

  if (nameIdx === -1 || amountIdx === -1) {
    console.error('Usage: test-payment.ts --name "Payer Name" --amount 123.45')
    process.exit(1)
  }

  const name = args[nameIdx + 1]
  const amount = parseFloat(args[amountIdx + 1])

  if (!name || isNaN(amount) || amount <= 0) {
    console.error('Invalid --name or --amount value')
    process.exit(1)
  }

  console.log(`Sending mock Venmo payment: "${name}" $${amount.toFixed(2)}`)

  const event = buildVenmoSesEvent(name, amount)
  const context = createMockContext()
  const { handler } = await import('../index.js')
  const result = await handler(event, context)
  console.log('Handler result:', result)
}

main().catch((err: Error) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
