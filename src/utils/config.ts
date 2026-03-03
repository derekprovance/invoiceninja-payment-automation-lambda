function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  baseUrl: requireEnv('BASE_URL'),
  paymentProcessor: {
    venmo: {
      gatewayId: process.env.VENMO_PAYMENT_GATEWAY_ID ?? '25',
      email: process.env.VENMO_EMAIL ?? 'venmo@venmo.com',
    },
  },
  token: requireEnv('TOKEN'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  appName: 'invoiceninja-payment-automation',
}
