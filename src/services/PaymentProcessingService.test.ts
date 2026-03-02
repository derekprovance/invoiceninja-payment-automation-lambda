import { describe, it, expect, vi } from 'vitest'
import { PaymentProcessingService } from './PaymentProcessingService'

vi.mock('../utils/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))
import {
  IInvoiceRepository,
  InvoiceNinjaInvoice,
} from '../interfaces/IInvoiceRepository'
import { IPayment } from '../interfaces/IPayment'
import { UnhandledScenarioError } from '../utils/errors/UnhandledScenarioError'

function makePayment(name: string, amount: number): IPayment {
  return {
    getName: () => name,
    getAmount: () => amount,
    getPaymentId: () => 'gateway-25',
    isValid: () => true,
  }
}

function makeRepo(
  overrides: Partial<IInvoiceRepository> = {},
): IInvoiceRepository {
  return {
    createPayment: vi.fn().mockResolvedValue({ id: 'pay-1' }),
    getClients: vi.fn().mockResolvedValue([]),
    listInvoices: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe('PaymentProcessingService', () => {
  it('returns no_client when no clients found', async () => {
    const repo = makeRepo({ getClients: vi.fn().mockResolvedValue([]) })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(makePayment('Alice Bob', 50))
    expect(result).toEqual({ status: 'no_client' })
  })

  it('returns no_invoice when no matching invoice found', async () => {
    const repo = makeRepo({
      getClients: vi
        .fn()
        .mockResolvedValue([{ id: 'c1', name: 'Alice Bob', contacts: [] }]),
      listInvoices: vi.fn().mockResolvedValue([{ id: 'inv-1', amount: 99 }]),
    })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(makePayment('Alice Bob', 50))
    expect(result).toEqual({ status: 'no_invoice' })
  })

  it('returns success when exact amount match found', async () => {
    const repo = makeRepo({
      getClients: vi
        .fn()
        .mockResolvedValue([{ id: 'c1', name: 'Alice Bob', contacts: [] }]),
      listInvoices: vi.fn().mockResolvedValue([{ id: 'inv-1', amount: 50 }]),
    })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(makePayment('Alice Bob', 50))
    expect(result.status).toBe('success')
  })

  it('matches with float tolerance (10.1 + 20.2 ≈ 30.3)', async () => {
    const invoices: InvoiceNinjaInvoice[] = [
      { id: 'inv-1', amount: 10.1 },
      { id: 'inv-2', amount: 20.2 },
    ]
    const repo = makeRepo({
      getClients: vi
        .fn()
        .mockResolvedValue([{ id: 'c1', name: 'Alice Bob', contacts: [] }]),
      listInvoices: vi.fn().mockResolvedValue(invoices),
    })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(makePayment('Alice Bob', 30.3))
    expect(result.status).toBe('success')
  })

  it('throws UnhandledScenarioError when multiple clients have the same name', async () => {
    const repo = makeRepo({
      getClients: vi.fn().mockResolvedValue([
        { id: 'c1', name: 'Alice Bob', contacts: [] },
        { id: 'c2', name: 'Alice Bob', contacts: [] },
      ]),
    })
    const svc = new PaymentProcessingService(repo)
    await expect(
      svc.processPayment(makePayment('Alice Bob', 50)),
    ).rejects.toThrow(UnhandledScenarioError)
  })

  describe('two-pass name matching', () => {
    it('returns the exact match when API returns a superset (e.g. "John Smith Jr." also returned)', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([
          { id: 'c1', name: 'John Smith', contacts: [] },
          { id: 'c2', name: 'John Smith Jr.', contacts: [] },
        ]),
        listInvoices: vi.fn().mockResolvedValue([{ id: 'inv-1', amount: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(makePayment('John Smith', 50))
      expect(result.status).toBe('success')
    })

    it('matches despite casing difference in stored name', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([{ id: 'c1', name: 'JOHN SMITH', contacts: [] }]),
        listInvoices: vi.fn().mockResolvedValue([{ id: 'inv-1', amount: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(makePayment('John Smith', 50))
      expect(result.status).toBe('success')
    })

    it('falls back to contacts when stored name does not match', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([
          {
            id: 'c1',
            name: 'Smith Family',
            contacts: [{ first_name: 'John', last_name: 'Smith' }],
          },
        ]),
        listInvoices: vi.fn().mockResolvedValue([{ id: 'inv-1', amount: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(makePayment('John Smith', 50))
      expect(result.status).toBe('success')
    })

    it('throws UnhandledScenarioError when two clients match via contacts', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([
          {
            id: 'c1',
            name: 'Smith Family A',
            contacts: [{ first_name: 'John', last_name: 'Smith' }],
          },
          {
            id: 'c2',
            name: 'Smith Family B',
            contacts: [{ first_name: 'John', last_name: 'Smith' }],
          },
        ]),
      })
      const svc = new PaymentProcessingService(repo)
      await expect(
        svc.processPayment(makePayment('John Smith', 50)),
      ).rejects.toThrow(UnhandledScenarioError)
    })

    it('returns no_client when API returns a result that does not normalize to an exact match', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([
          { id: 'c1', name: 'Johnson Smith', contacts: [] },
        ]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(makePayment('John Smith', 50))
      expect(result).toEqual({ status: 'no_client' })
    })
  })
})
