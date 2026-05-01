import { ContactCustomField } from '../interfaces/IInvoiceRepository'

const PLACEHOLDER_PATTERN = /^your_.*_here$/
const VALID_CONTACT_FIELDS: ReadonlySet<string> = new Set([
  'custom_value1',
  'custom_value2',
  'custom_value3',
  'custom_value4',
])

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(
      `Environment variable ${name} still has placeholder value. Update .env with real values.`,
    )
  }
  return value
}

function parseContactField(
  value: string | undefined,
): ContactCustomField | null {
  if (!value) return null
  if (!VALID_CONTACT_FIELDS.has(value)) {
    throw new Error(
      `Invalid VENMO_USERNAME_CONTACT_FIELD: "${value}". Must be one of: custom_value1, custom_value2, custom_value3, custom_value4`,
    )
  }
  return value as ContactCustomField
}

export const config = {
  baseUrl: requireEnv('BASE_URL'),
  paymentProcessor: {
    venmo: {
      gatewayId: process.env.VENMO_PAYMENT_GATEWAY_ID ?? '25',
      email: process.env.VENMO_EMAIL ?? 'venmo@venmo.com',
      usernameContactField: parseContactField(
        process.env.VENMO_USERNAME_CONTACT_FIELD,
      ),
    },
  },
  token: requireEnv('TOKEN'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  appName: 'invoiceninja-payment-automation',
}
