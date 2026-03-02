import { describe, it, expect, vi } from 'vitest'
import { InvalidPaymentError } from '../utils/errors/InvalidPaymentError'
import { ParserError } from '../utils/errors/ParserError'
import { createPayment } from './PaymentFactory'

vi.mock('../utils/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

vi.mock('../utils/config', () => ({
  config: {
    baseUrl: 'http://localhost',
    token: 'test-token',
    logLevel: 'info',
    appName: 'test',
    paymentProcessor: {
      venmo: {
        email: 'venmo@venmo.com',
        gatewayId: 'test-gateway-25',
      },
    },
  },
}))

describe('createPayment', () => {
  it('returns a valid IPayment for a Venmo email', () => {
    const payment = createPayment(
      'venmo@venmo.com',
      'Alice Bob paid you $50.00',
    )
    expect(payment.getName()).toBe('Alice Bob')
    expect(payment.getAmount()).toBe(50)
    expect(payment.getPaymentId()).toBe('test-gateway-25')
  })

  it('throws InvalidPaymentError for an unknown email', () => {
    expect(() =>
      createPayment('unknown@example.com', 'Alice Bob paid you $50.00'),
    ).toThrow(InvalidPaymentError)
  })

  it('propagates ParserError on parse failure (no silent swallowing)', () => {
    expect(() =>
      createPayment('venmo@venmo.com', 'invalid subject with no money'),
    ).toThrow(ParserError)
  })
})
