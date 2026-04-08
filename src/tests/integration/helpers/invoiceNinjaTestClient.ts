import axios, { AxiosInstance } from 'axios'
import { InvoiceNinjaContact } from '../../../interfaces/IInvoiceRepository'

export interface CreatedClient {
  id: string
  name: string
}

export interface CreatedInvoice {
  id: string
  amount: number
  status_id: string
}

export class InvoiceNinjaTestClient {
  private readonly client: AxiosInstance
  private createdClientIds: string[] = []
  private createdInvoiceIds: string[] = []
  private createdPaymentIds: string[] = []

  constructor(baseUrl: string, token: string) {
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      headers: {
        'X-API-TOKEN': token,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
      },
    })
  }

  async createClient(
    name: string,
    firstName: string,
    lastName: string,
    customValue1?: string,
  ): Promise<CreatedClient> {
    const contact: InvoiceNinjaContact = { first_name: firstName, last_name: lastName }
    if (customValue1) {
      contact.custom_value1 = customValue1
    }
    const response = await this.client.post('/clients', {
      name,
      contacts: [contact],
    })
    const created = response.data.data as CreatedClient
    this.createdClientIds.push(created.id)
    return created
  }

  async createInvoice(
    clientId: string,
    amount: number,
  ): Promise<CreatedInvoice> {
    const response = await this.client.post('/invoices', {
      client_id: clientId,
      line_items: [
        {
          quantity: 1,
          cost: amount,
          product_key: 'Integration Test',
        },
      ],
    })
    const created = response.data.data as CreatedInvoice
    this.createdInvoiceIds.push(created.id)

    // Invoice Ninja ignores status_id on creation; invoices always start as Draft.
    // Mark as Sent so the invoice appears in `client_status=unpaid` queries.
    // NOTE: The returned object's status_id reflects Draft status; use getInvoice()
    // to retrieve the updated status_id after this call completes.
    await this.client.put(`/invoices/${created.id}?mark_sent=true`, {})

    return created
  }

  async getPaymentsForClient(
    clientId: string,
  ): Promise<Array<{ id: string; amount: number }>> {
    const response = await this.client.get('/payments', {
      params: { client_id: clientId },
    })
    return response.data.data as Array<{ id: string; amount: number }>
  }

  async getInvoice(invoiceId: string): Promise<CreatedInvoice> {
    const response = await this.client.get(`/invoices/${invoiceId}`)
    return response.data.data as CreatedInvoice
  }

  async getClientCredit(clientId: string): Promise<number> {
    const response = await this.client.get(`/clients/${clientId}`)
    const client = response.data.data as { credit_balance: number }
    return client.credit_balance
  }

  async recordPayment(
    clientId: string,
    invoiceId: string,
    amount: number,
  ): Promise<void> {
    const response = await this.client.post('/payments', {
      client_id: clientId,
      amount,
      invoices: [{ invoice_id: invoiceId, amount }],
    })
    this.createdPaymentIds.push(response.data.data.id)
  }

  private async cleanupTracked(
    resource: string,
    ids: string[],
    clearFn: () => void,
  ): Promise<void> {
    if (ids.length === 0) return
    await this.bulkDelete(resource, ids).catch((e) =>
      console.warn(`Warning: failed to clean up ${resource}: ${e}`),
    )
    clearFn()
  }

  async cleanupAll(): Promise<void> {
    // Collect all payment IDs created against tracked clients (including those
    // created by the handler under test, which are not tracked explicitly).
    for (const clientId of this.createdClientIds) {
      try {
        const payments = await this.getPaymentsForClient(clientId)
        const ids = (payments as Array<{ id: string }>).map((p) => p.id)
        this.createdPaymentIds.push(...ids)
      } catch (e) {
        console.warn(
          `Warning: could not fetch payments for client ${clientId}: ${e}`,
        )
      }
    }

    if (this.createdPaymentIds.length > 0) {
      // Deduplicate IDs to avoid errors if recordPayment IDs are also fetched via getPaymentsForClient
      const uniquePaymentIds = [...new Set(this.createdPaymentIds)]
      await this.bulkDelete('payments', uniquePaymentIds).catch((e) => {
        console.warn(`Warning: failed to clean up payments: ${e}`)
      })
      this.createdPaymentIds = []
    }

    // Collect all credit IDs created against tracked clients
    const creditIds: string[] = []
    for (const clientId of this.createdClientIds) {
      try {
        const response = await this.client.get('/credits', {
          params: { client_id: clientId },
        })
        const credits = response.data.data as Array<{ id: string }>
        creditIds.push(...credits.map((c) => c.id))
      } catch (e) {
        console.warn(
          `Warning: could not fetch credits for client ${clientId}: ${e}`,
        )
      }
    }
    await this.cleanupTracked('credits', creditIds, () => {})

    await this.cleanupTracked('invoices', this.createdInvoiceIds, () => {
      this.createdInvoiceIds = []
    })

    await this.cleanupTracked('clients', this.createdClientIds, () => {
      this.createdClientIds = []
    })
  }

  private async bulkDelete(resource: string, ids: string[]): Promise<void> {
    await this.client.post(`/${resource}/bulk`, {
      action: 'delete',
      ids,
    })
  }
}
