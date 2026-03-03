import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { handler } from '../../../index'
import { InvoiceNinjaTestClient } from './helpers/invoiceNinjaTestClient'
import { buildVenmoSesEvent, createMockContext } from './helpers/sesEventFactory'
import { INVOICE_STATUS_PAID } from '../../../src/interfaces/IInvoiceRepository'

const BASE_URL = process.env.IN_BASE_URL!
const TOKEN = process.env.IN_TOKEN!

describe('Payment integration tests', () => {
  let testClient: InvoiceNinjaTestClient

  beforeEach(() => {
    testClient = new InvoiceNinjaTestClient(BASE_URL, TOKEN)
  })

  afterEach(async () => {
    await testClient.cleanupAll()
  })

  it('exact client name match: marks invoice as paid', async () => {
    const client = await testClient.createClient(
      'Samuel Hayden',
      'Samuel',
      'Hayden',
    )
    const inv = await testClient.createInvoice(client.id, 150)

    const event = buildVenmoSesEvent('Samuel Hayden', 150)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments.length).toBeGreaterThan(0)

    const updated = await testClient.getInvoice(inv.id)
    expect(updated.status_id).toBe(INVOICE_STATUS_PAID)
  })

  it('contact name match: finds client by contact first+last name', async () => {
    const client = await testClient.createClient(
      'Hayden Foundation',
      'Elena',
      'Richardson',
    )
    await testClient.createInvoice(client.id, 75.5)

    const event = buildVenmoSesEvent('Elena Richardson', 75.5)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')
  })

  it('multi-invoice allocation: two invoices fully paid by combined amount', async () => {
    const client = await testClient.createClient('Olivia Pierce', 'Olivia', 'Pierce')
    const inv1 = await testClient.createInvoice(client.id, 20)
    const inv2 = await testClient.createInvoice(client.id, 30)

    const event = buildVenmoSesEvent('Olivia Pierce', 50)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const updated1 = await testClient.getInvoice(inv1.id)
    const updated2 = await testClient.getInvoice(inv2.id)
    expect(updated1.status_id).toBe(INVOICE_STATUS_PAID)
    expect(updated2.status_id).toBe(INVOICE_STATUS_PAID)
  })

  it('no matching client: returns no_client status', async () => {
    const event = buildVenmoSesEvent('Lost Soul', 50)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('no_client')
  })

  it('client with no invoices: returns no_invoice status', async () => {
    await testClient.createClient('Malcolm Betruger', 'Malcolm', 'Betruger')

    const event = buildVenmoSesEvent('Malcolm Betruger', 50)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('no_invoice')
  })

  it('partial payment: invoice stays open', async () => {
    const client = await testClient.createClient('Jack Oliveri', 'Jack', 'Oliveri')
    const inv = await testClient.createInvoice(client.id, 30)

    const event = buildVenmoSesEvent('Jack Oliveri', 20)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const updated = await testClient.getInvoice(inv.id)
    expect(updated.status_id).not.toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(20)
  })

  it('overpayment: invoice paid, full payment recorded, and surplus credited', async () => {
    const client = await testClient.createClient('Ellen Moon', 'Ellen', 'Moon')
    const inv = await testClient.createInvoice(client.id, 10)

    const event = buildVenmoSesEvent('Ellen Moon', 20)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const updated = await testClient.getInvoice(inv.id)
    expect(updated.status_id).toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments[0].amount).toBe(20)

    const credit = await testClient.getClientCredit(client.id)
    expect(credit).toBe(10)
  })

  it('three-invoice oldest-first: oldest invoices paid first', async () => {
    const client = await testClient.createClient(
      'Kelvin Garland',
      'Kelvin',
      'Garland',
    )
    const inv10 = await testClient.createInvoice(client.id, 10)
    const inv25 = await testClient.createInvoice(client.id, 25)
    const inv40 = await testClient.createInvoice(client.id, 40)

    const event = buildVenmoSesEvent('Kelvin Garland', 35)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const updated10 = await testClient.getInvoice(inv10.id)
    expect(updated10.status_id).toBe(INVOICE_STATUS_PAID)

    const updated25 = await testClient.getInvoice(inv25.id)
    expect(updated25.status_id).toBe(INVOICE_STATUS_PAID)

    const updated40 = await testClient.getInvoice(inv40.id)
    expect(updated40.status_id).not.toBe(INVOICE_STATUS_PAID)
  })

  it('float tolerance: imprecise allocation amounts accepted', async () => {
    const client = await testClient.createClient('Sasha Sretensky', 'Sasha', 'Sretensky')
    const inv1 = await testClient.createInvoice(client.id, 10.1)
    const inv2 = await testClient.createInvoice(client.id, 20.2)

    const event = buildVenmoSesEvent('Sasha Sretensky', 30.3)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const updated1 = await testClient.getInvoice(inv1.id)
    expect(updated1.status_id).toBe(INVOICE_STATUS_PAID)

    const updated2 = await testClient.getInvoice(inv2.id)
    expect(updated2.status_id).toBe(INVOICE_STATUS_PAID)

    const credit = await testClient.getClientCredit(client.id)
    expect(credit).toBe(0)
  })

  it('paid invoice excluded: only unpaid invoice receives payment', async () => {
    const client = await testClient.createClient('Richard Meyers', 'Richard', 'Meyers')
    const inv50 = await testClient.createInvoice(client.id, 50)
    const openInv = await testClient.createInvoice(client.id, 30)

    await testClient.recordPayment(client.id, inv50.id, 50)

    const event = buildVenmoSesEvent('Richard Meyers', 30)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    const updated = await testClient.getInvoice(openInv.id)
    expect(updated.status_id).toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments.length).toBe(2)
  })

  it('exact match: $7.55 payment pays the $7.55 invoice, not the older $10 invoice', async () => {
    const client = await testClient.createClient('Elizabeth McNeil', 'Elizabeth', 'McNeil')
    const inv10 = await testClient.createInvoice(client.id, 10)
    const inv755 = await testClient.createInvoice(client.id, 7.55)

    const event = buildVenmoSesEvent('Elizabeth McNeil', 7.55)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    // $7.55 invoice should be paid (exact match takes precedence)
    const updated755 = await testClient.getInvoice(inv755.id)
    expect(updated755.status_id).toBe(INVOICE_STATUS_PAID)

    // $10 invoice should remain unpaid
    const updated10 = await testClient.getInvoice(inv10.id)
    expect(updated10.status_id).not.toBe(INVOICE_STATUS_PAID)

    // Payment should be recorded for exactly $7.55
    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(7.55)
  })

  it('oldest-first: larger but older invoice is paid before smaller newer one', async () => {
    const client = await testClient.createClient('Theodore McNeil', 'Theodore', 'McNeil')
    const invLarge = await testClient.createInvoice(client.id, 30) // created first → oldest
    const invSmall = await testClient.createInvoice(client.id, 10) // created second → newest

    const event = buildVenmoSesEvent('Theodore McNeil', 15)
    const context = createMockContext()
    const result = await handler(event, context)

    expect(result.status).toBe('success')

    // $15 applied to the $30 invoice (oldest) — partial payment
    const updatedLarge = await testClient.getInvoice(invLarge.id)
    expect(updatedLarge.status_id).not.toBe(INVOICE_STATUS_PAID)

    // $10 invoice untouched (it's newer, and $15 was exhausted on the $30)
    const updatedSmall = await testClient.getInvoice(invSmall.id)
    expect(updatedSmall.status_id).not.toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(15)
  })

  it('ambiguous client name: throws when two clients share the same name', async () => {
    await testClient.createClient('Marcus Strickland', 'Marcus', 'Strickland')
    await testClient.createClient('Marcus Strickland', 'Marcus', 'Strickland')

    const event = buildVenmoSesEvent('Marcus Strickland', 50)
    const context = createMockContext()
    await expect(handler(event, context)).rejects.toThrow()
  })
})
