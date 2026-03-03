import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { handler } from '../../../index'
import { InvoiceNinjaTestClient } from './helpers/invoiceNinjaTestClient'
import { buildVenmoSesEvent } from './helpers/sesEventFactory'

const BASE_URL = process.env.IN_BASE_URL!
const TOKEN = process.env.IN_TOKEN!
const INVOICE_STATUS_PAID = '4'

describe('Payment integration tests', () => {
  let testClient: InvoiceNinjaTestClient

  beforeEach(() => {
    testClient = new InvoiceNinjaTestClient(BASE_URL, TOKEN)
  })

  afterEach(async () => {
    await testClient.cleanupAll()
  })

  it('exact client name match: marks invoice as paid', async () => {
    const client = await testClient.createClient('Alice Smith', 'Alice', 'Smith')
    const inv = await testClient.createInvoice(client.id, 150)

    const event = buildVenmoSesEvent('Alice Smith', 150)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments.length).toBeGreaterThan(0)

    const updated = await testClient.getInvoice(inv.id)
    expect(updated.status_id).toBe(INVOICE_STATUS_PAID)
  })

  it('contact name match: finds client by contact first+last name', async () => {
    const client = await testClient.createClient('Smith Family', 'John', 'Smith')
    await testClient.createInvoice(client.id, 75.5)

    const event = buildVenmoSesEvent('John Smith', 75.5)
    const result = await handler(event)

    expect(result.status).toBe('success')
  })

  it('multi-invoice allocation: two invoices fully paid by combined amount', async () => {
    const client = await testClient.createClient('Bob Jones', 'Bob', 'Jones')
    const inv1 = await testClient.createInvoice(client.id, 20)
    const inv2 = await testClient.createInvoice(client.id, 30)

    const event = buildVenmoSesEvent('Bob Jones', 50)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const updated1 = await testClient.getInvoice(inv1.id)
    const updated2 = await testClient.getInvoice(inv2.id)
    expect(updated1.status_id).toBe(INVOICE_STATUS_PAID)
    expect(updated2.status_id).toBe(INVOICE_STATUS_PAID)
  })

  it('no matching client: returns no_client status', async () => {
    const event = buildVenmoSesEvent('Ghost Person', 50)
    const result = await handler(event)

    expect(result.status).toBe('no_client')
  })

  it('client with no invoices: returns no_invoice status', async () => {
    await testClient.createClient('Carol White', 'Carol', 'White')

    const event = buildVenmoSesEvent('Carol White', 50)
    const result = await handler(event)

    expect(result.status).toBe('no_invoice')
  })

  it('partial payment: invoice stays open', async () => {
    const client = await testClient.createClient('Dana Brown', 'Dana', 'Brown')
    const inv = await testClient.createInvoice(client.id, 30)

    const event = buildVenmoSesEvent('Dana Brown', 20)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const updated = await testClient.getInvoice(inv.id)
    expect(updated.status_id).not.toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(20)
  })

  it('overpayment: invoice paid, full payment recorded, and surplus credited', async () => {
    const client = await testClient.createClient('Eve Black', 'Eve', 'Black')
    const inv = await testClient.createInvoice(client.id, 10)

    const event = buildVenmoSesEvent('Eve Black', 20)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const updated = await testClient.getInvoice(inv.id)
    expect(updated.status_id).toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments[0].amount).toBe(20)

    const credit = await testClient.getClientCredit(client.id)
    expect(credit).toBe(10)
  })

  it('three-invoice oldest-first: oldest invoices paid first', async () => {
    const client = await testClient.createClient('Frank Green', 'Frank', 'Green')
    const inv10 = await testClient.createInvoice(client.id, 10)
    const inv25 = await testClient.createInvoice(client.id, 25)
    const inv40 = await testClient.createInvoice(client.id, 40)

    const event = buildVenmoSesEvent('Frank Green', 35)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const updated10 = await testClient.getInvoice(inv10.id)
    expect(updated10.status_id).toBe(INVOICE_STATUS_PAID)

    const updated25 = await testClient.getInvoice(inv25.id)
    expect(updated25.status_id).toBe(INVOICE_STATUS_PAID)

    const updated40 = await testClient.getInvoice(inv40.id)
    expect(updated40.status_id).not.toBe('4')
  })

  it('float tolerance: imprecise allocation amounts accepted', async () => {
    const client = await testClient.createClient('Grace Ho', 'Grace', 'Ho')
    const inv1 = await testClient.createInvoice(client.id, 10.1)
    const inv2 = await testClient.createInvoice(client.id, 20.2)

    const event = buildVenmoSesEvent('Grace Ho', 30.3)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const updated1 = await testClient.getInvoice(inv1.id)
    expect(updated1.status_id).toBe(INVOICE_STATUS_PAID)

    const updated2 = await testClient.getInvoice(inv2.id)
    expect(updated2.status_id).toBe(INVOICE_STATUS_PAID)

    const credit = await testClient.getClientCredit(client.id)
    expect(credit).toBe(0)
  })

  it('paid invoice excluded: only unpaid invoice receives payment', async () => {
    const client = await testClient.createClient('Henry Wu', 'Henry', 'Wu')
    const inv50 = await testClient.createInvoice(client.id, 50)
    const openInv = await testClient.createInvoice(client.id, 30)

    await testClient.recordPayment(client.id, inv50.id, 50)

    const event = buildVenmoSesEvent('Henry Wu', 30)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const updated = await testClient.getInvoice(openInv.id)
    expect(updated.status_id).toBe(INVOICE_STATUS_PAID)

    const payments = await testClient.getPaymentsForClient(client.id)
    expect(payments.length).toBe(2)
  })

  it('exact match: $7.55 payment pays the $7.55 invoice, not the older $10 invoice', async () => {
    const client = await testClient.createClient('Ivy Chen', 'Ivy', 'Chen')
    const inv10 = await testClient.createInvoice(client.id, 10)
    const inv755 = await testClient.createInvoice(client.id, 7.55)

    const event = buildVenmoSesEvent('Ivy Chen', 7.55)
    const result = await handler(event)

    expect(result.status).toBe('success')

    // $7.55 invoice should be paid (matches exactly via greedy sort)
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
    const client = await testClient.createClient('Jake Kim', 'Jake', 'Kim')
    const invLarge = await testClient.createInvoice(client.id, 30)  // created first → oldest
    const invSmall = await testClient.createInvoice(client.id, 10)  // created second → newest

    const event = buildVenmoSesEvent('Jake Kim', 15)
    const result = await handler(event)

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
})
