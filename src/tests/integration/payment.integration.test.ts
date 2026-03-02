import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { handler } from '../../../index'
import { InvoiceNinjaTestClient } from './helpers/invoiceNinjaTestClient'
import { buildVenmoSesEvent } from './helpers/sesEventFactory'

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
    const client = await testClient.createClient('Alice Smith', 'Alice', 'Smith')
    await testClient.createInvoice(client.id, 150)

    const event = buildVenmoSesEvent('Alice Smith', 150)
    const result = await handler(event)

    expect(result.status).toBe('success')

    const invoices = await testClient.getPaymentsForClient(client.id)
    expect(invoices.length).toBeGreaterThan(0)
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
    expect(updated1.status_id).toBe('4')
    expect(updated2.status_id).toBe('4')
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
})
