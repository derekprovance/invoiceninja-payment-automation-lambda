import { describe, it, expect, vi } from 'vitest'
import { PaymentProcessingService } from './PaymentProcessingService'

vi.mock('../utils/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))
import {
  IInvoiceRepository,
  InvoiceNinjaInvoice,
  InvoiceNinjaContact,
  InvoiceNinjaClient,
} from '../interfaces/IInvoiceRepository'
import { IPayment } from '../interfaces/IPayment'
import { UnhandledScenarioError } from '../utils/errors/UnhandledScenarioError'

const TRACE_ID = 'test-trace-id'

function makePayment(name: string, amount: number): IPayment {
  return {
    getName: () => name,
    getAmount: () => amount,
    getPaymentId: () => 'gateway-25',
  }
}

function makeClient(
  id: string,
  name: string,
  contacts: InvoiceNinjaContact[] = [],
): InvoiceNinjaClient {
  return { id, name, contacts }
}

function makeRepo(
  overrides: Partial<IInvoiceRepository> = {},
): IInvoiceRepository {
  return {
    createPayment: vi.fn().mockResolvedValue({ id: 'pay-1' }),
    getClients: vi.fn().mockResolvedValue([]),
    getClientById: vi.fn().mockResolvedValue({} as any),
    listInvoices: vi.fn().mockResolvedValue([]),
    createCredit: vi.fn().mockResolvedValue({ id: 'credit-1' }),
    ...overrides,
  }
}

describe('PaymentProcessingService', () => {
  it('returns no_client when no clients found', async () => {
    const repo = makeRepo({ getClients: vi.fn().mockResolvedValue([]) })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(
      makePayment('Alice Bob', 50),
      TRACE_ID,
    )
    expect(result).toEqual({ status: 'no_client' })
  })

  it('returns no_invoice when invoice list is empty', async () => {
    const repo = makeRepo({
      getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
      listInvoices: vi.fn().mockResolvedValue([]),
    })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(
      makePayment('Alice Bob', 50),
      TRACE_ID,
    )
    expect(result).toEqual({ status: 'no_invoice' })
  })

  it('returns success when exact amount match found', async () => {
    const repo = makeRepo({
      getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
      listInvoices: vi
        .fn()
        .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
    })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(
      makePayment('Alice Bob', 50),
      TRACE_ID,
    )
    expect(result.status).toBe('success')
  })

  it('matches with float tolerance (10.1 + 20.2 ≈ 30.3)', async () => {
    const createCredit = vi.fn().mockResolvedValue({ id: 'credit-1' })
    const invoices: InvoiceNinjaInvoice[] = [
      { id: 'inv-1', amount: 10.1, balance: 10.1 },
      { id: 'inv-2', amount: 20.2, balance: 20.2 },
    ]
    const repo = makeRepo({
      getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
      listInvoices: vi.fn().mockResolvedValue(invoices),
      createCredit,
    })
    const svc = new PaymentProcessingService(repo)
    const result = await svc.processPayment(
      makePayment('Alice Bob', 30.3),
      TRACE_ID,
    )
    expect(result.status).toBe('success')
    expect(createCredit).not.toHaveBeenCalled()
  })

  it('throws UnhandledScenarioError when multiple clients have the same name', async () => {
    const repo = makeRepo({
      getClients: vi
        .fn()
        .mockResolvedValue([
          makeClient('c1', 'Alice Bob'),
          makeClient('c2', 'Alice Bob'),
        ]),
    })
    const svc = new PaymentProcessingService(repo)
    await expect(
      svc.processPayment(makePayment('Alice Bob', 50), TRACE_ID),
    ).rejects.toThrow(UnhandledScenarioError)
  })

  describe('two-pass name matching', () => {
    it('returns the exact match when API returns a superset (e.g. "John Smith Jr." also returned)', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([
            makeClient('c1', 'John Smith'),
            makeClient('c2', 'John Smith Jr.'),
          ]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })

    it('matches despite casing difference in stored name', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([{ id: 'c1', name: 'JOHN SMITH', contacts: [] }]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })

    it('falls back to contacts when stored name does not match', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([
            makeClient('c1', 'Smith Family', [
              { first_name: 'John', last_name: 'Smith' },
            ]),
          ]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })

    it('matches contact via custom_value1 (Venmo Username) when present', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([
            makeClient('c1', 'Smith Family', [
              {
                first_name: 'John',
                last_name: 'Smith',
                custom_value1: 'JohnVenmo',
              },
            ]),
          ]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo, 'custom_value1')
      const result = await svc.processPayment(
        makePayment('JohnVenmo', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })

    it('prefers custom_value1 over first_name + last_name when present', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([
            makeClient('c1', 'Smith Family', [
              {
                first_name: 'John',
                last_name: 'Smith',
                custom_value1: 'JohnVenmo',
              },
            ]),
          ]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo, 'custom_value1')
      // Payment uses 'JohnVenmo' (custom_value1), not 'John Smith' (first + last)
      const result = await svc.processPayment(
        makePayment('JohnVenmo', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      // Verify that 'John Smith' would NOT match (because custom_value1 is preferred)
      const result2 = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result2).toEqual({ status: 'no_client' })
    })

    it('falls back to first_name + last_name when custom field is configured but empty on contact', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([
          makeClient('c1', 'Smith Family', [
            { first_name: 'John', last_name: 'Smith' }, // no custom_value1
          ]),
        ]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo, 'custom_value1')
      // Payment name matches first + last; custom field is configured but not set on this contact
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })

    it('throws UnhandledScenarioError when two clients match via contacts', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([
            makeClient('c1', 'Smith Family A', [
              { first_name: 'John', last_name: 'Smith' },
            ]),
            makeClient('c2', 'Smith Family B', [
              { first_name: 'John', last_name: 'Smith' },
            ]),
          ]),
      })
      const svc = new PaymentProcessingService(repo)
      await expect(
        svc.processPayment(makePayment('John Smith', 50), TRACE_ID),
      ).rejects.toThrow(UnhandledScenarioError)
    })

    it('returns no_client when API returns a result that does not normalize to an exact match', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([makeClient('c1', 'Johnson Smith')]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result).toEqual({ status: 'no_client' })
    })

    it('calls getClientById when contacts array is empty on list result', async () => {
      const getClientById = vi
        .fn()
        .mockResolvedValue(
          makeClient('c1', 'Smith Family', [
            { first_name: 'John', last_name: 'Smith' },
          ]),
        )
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([
          makeClient('c1', 'Smith Family'), // empty contacts → triggers getClientById
        ]),
        getClientById,
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(getClientById).toHaveBeenCalledWith('c1')
    })

    it('returns no_client when client has contacts but none match the payment name', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([
            makeClient('c1', 'Smith Family', [
              { first_name: 'Jane', last_name: 'Doe' },
            ]),
          ]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result).toEqual({ status: 'no_client' })
    })

    it('normalizes leading/trailing whitespace in payment name', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'John Smith')]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('  John Smith  ', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })

    it('normalizes multiple internal spaces in stored client name', async () => {
      const repo = makeRepo({
        getClients: vi
          .fn()
          .mockResolvedValue([makeClient('c1', 'John  Smith')]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 50, balance: 50 }]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('John Smith', 50),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
    })
  })

  describe('allocatePayment', () => {
    it('Scenario 1: no invoices → no_invoice', async () => {
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi.fn().mockResolvedValue([]),
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('Alice Bob', 20),
        TRACE_ID,
      )
      expect(result).toEqual({ status: 'no_invoice' })
    })

    it('Scenario 2: $20 payment, $30 invoice → partial payment applied', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 30, balance: 30 }]),
        createPayment,
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('Alice Bob', 20),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [{ invoice_id: 'inv-1', amount: 20 }],
        20,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
    })

    it('Scenario 3: $20 payment, $10 + $30 invoices → $10 paid in full, $10 partial on $30', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi.fn().mockResolvedValue([
          { id: 'inv-2', amount: 30, balance: 30, date: '2024-02-01' },
          { id: 'inv-1', amount: 10, balance: 10, date: '2024-01-01' },
        ]),
        createPayment,
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('Alice Bob', 20),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [
          { invoice_id: 'inv-1', amount: 10 },
          { invoice_id: 'inv-2', amount: 10 },
        ],
        20,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
    })

    it('Scenario 4: $20 payment, $10 invoice → $10 paid in full, $10 overpayment creates credit', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const createCredit = vi.fn().mockResolvedValue({ id: 'credit-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi
          .fn()
          .mockResolvedValue([{ id: 'inv-1', amount: 10, balance: 10 }]),
        createPayment,
        createCredit,
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('Alice Bob', 20),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [{ invoice_id: 'inv-1', amount: 10 }],
        20,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
      expect(createCredit).toHaveBeenCalledWith('c1', 10, TRACE_ID)
    })

    it('Scenario 5: exact match — pays matching invoice even when an older one exists', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi.fn().mockResolvedValue([
          { id: 'inv-old', amount: 7, balance: 7, date: '2024-01-01' },
          { id: 'inv-exact', amount: 10, balance: 10, date: '2024-02-01' },
        ]),
        createPayment,
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('Alice Bob', 10),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [{ invoice_id: 'inv-exact', amount: 10 }],
        10,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
    })

    it('Scenario 6: multiple exact matches fall through to oldest-first (pays older invoice)', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi.fn().mockResolvedValue([
          { id: 'inv-newer', amount: 10, balance: 10, date: '2024-02-01' },
          { id: 'inv-older', amount: 10, balance: 10, date: '2024-01-01' },
        ]),
        createPayment,
      })
      const svc = new PaymentProcessingService(repo)
      const result = await svc.processPayment(
        makePayment('Alice Bob', 10),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [{ invoice_id: 'inv-older', amount: 10 }],
        10,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
    })

    it('Scenario 7: invoice with no date field is treated as oldest', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi.fn().mockResolvedValue([
          { id: 'inv-dated', amount: 30, balance: 30, date: '2024-06-01' },
          { id: 'inv-nodated', amount: 20, balance: 20 }, // no date → '' → sorted oldest
        ]),
        createPayment,
      })
      const svc = new PaymentProcessingService(repo)
      // $15 matches neither invoice exactly → Pass 1 skipped, Pass 2 runs
      const result = await svc.processPayment(
        makePayment('Alice Bob', 15),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [{ invoice_id: 'inv-nodated', amount: 15 }],
        15,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
    })

    it('Scenario 8: same date — earlier created_at wins tiebreaker', async () => {
      const createPayment = vi.fn().mockResolvedValue({ id: 'pay-1' })
      const repo = makeRepo({
        getClients: vi.fn().mockResolvedValue([makeClient('c1', 'Alice Bob')]),
        listInvoices: vi.fn().mockResolvedValue([
          {
            id: 'inv-later',
            amount: 30,
            balance: 30,
            date: '2024-05-01',
            created_at: 1714600000,
          },
          {
            id: 'inv-earlier',
            amount: 25,
            balance: 25,
            date: '2024-05-01',
            created_at: 1714500000,
          },
        ]),
        createPayment,
      })
      const svc = new PaymentProcessingService(repo)
      // $15 matches neither invoice → Pass 1 skipped; same date → created_at tiebreaker resolves
      const result = await svc.processPayment(
        makePayment('Alice Bob', 15),
        TRACE_ID,
      )
      expect(result.status).toBe('success')
      expect(createPayment).toHaveBeenCalledWith(
        [{ invoice_id: 'inv-earlier', amount: 15 }],
        15,
        'c1',
        'gateway-25',
        TRACE_ID,
      )
    })
  })
})
