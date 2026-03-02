import { describe, it, expect, vi } from 'vitest'
import { VenmoPayment } from './VenmoPayment'

vi.mock('../../utils/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))
import { InvalidPaymentError } from '../../utils/errors/InvalidPaymentError'
import { ParserError } from '../../utils/errors/ParserError'

const GATEWAY_ID = 'test-gateway-id'

describe('VenmoPayment', () => {
  describe('name parsing', () => {
    it('parses a simple two-word name', () => {
      const p = new VenmoPayment('John Smith paid you $50.00', GATEWAY_ID)
      expect(p.getName()).toBe('John Smith')
    })

    it('parsed name has no leading or trailing whitespace', () => {
      const p = new VenmoPayment('John Smith paid you $50.00   ', GATEWAY_ID)
      expect(p.getName()).toBe('John Smith')
    })

    it('parses a hyphenated last name', () => {
      const p = new VenmoPayment('Mary-Jane Watson paid you $25.00', GATEWAY_ID)
      expect(p.getName()).toBe('Mary-Jane Watson')
    })

    it('parses a name with an apostrophe', () => {
      const p = new VenmoPayment("Patrick O'Brien paid you $100.00", GATEWAY_ID)
      expect(p.getName()).toBe("Patrick O'Brien")
    })

    it('parses a three-word name', () => {
      const p = new VenmoPayment('John Paul Jones paid you $75.00', GATEWAY_ID)
      expect(p.getName()).toBe('John Paul Jones')
    })
  })

  describe('amount parsing', () => {
    it('parses whole dollar amounts', () => {
      const p = new VenmoPayment('Alice Bob paid you $100', GATEWAY_ID)
      expect(p.getAmount()).toBe(100)
    })

    it('parses amounts with cents', () => {
      const p = new VenmoPayment('Alice Bob paid you $42.99', GATEWAY_ID)
      expect(p.getAmount()).toBe(42.99)
    })

    it('parses amounts with one decimal place', () => {
      const p = new VenmoPayment('Alice Bob paid you $9.5', GATEWAY_ID)
      expect(p.getAmount()).toBe(9.5)
    })
  })

  describe('validation', () => {
    it('throws InvalidPaymentError for $0.00', () => {
      expect(
        () => new VenmoPayment('Alice Bob paid you $0.00', GATEWAY_ID),
      ).toThrow(InvalidPaymentError)
    })

    it('throws InvalidPaymentError for $0 (no cents)', () => {
      expect(
        () => new VenmoPayment('Alice Bob paid you $0', GATEWAY_ID),
      ).toThrow(InvalidPaymentError)
    })
  })

  describe('getPaymentId', () => {
    it('returns the gatewayId passed to the constructor', () => {
      const p = new VenmoPayment('Alice Bob paid you $10.00', GATEWAY_ID)
      expect(p.getPaymentId()).toBe(GATEWAY_ID)
    })
  })

  describe('parse errors', () => {
    it('throws ParserError when "paid you" is missing', () => {
      expect(() => new VenmoPayment('Hello world $50.00', GATEWAY_ID)).toThrow(
        ParserError,
      )
    })
  })
})
