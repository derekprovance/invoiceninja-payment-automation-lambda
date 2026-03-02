import axios, { AxiosInstance } from 'axios'

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
  ): Promise<CreatedClient> {
    const response = await this.client.post('/clients', {
      name,
      contacts: [{ first_name: firstName, last_name: lastName }],
    })
    const created = response.data.data as CreatedClient
    this.createdClientIds.push(created.id)
    return created
  }

  async createInvoice(clientId: string, amount: number): Promise<CreatedInvoice> {
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
    await this.client.put(`/invoices/${created.id}?mark_sent=true`, {})

    return created
  }

  async getPaymentsForClient(clientId: string): Promise<unknown[]> {
    const response = await this.client.get('/payments', {
      params: { client_id: clientId },
    })
    return response.data.data as unknown[]
  }

  async getInvoice(invoiceId: string): Promise<CreatedInvoice> {
    const response = await this.client.get(`/invoices/${invoiceId}`)
    return response.data.data as CreatedInvoice
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
        console.warn(`Warning: could not fetch payments for client ${clientId}: ${e}`)
      }
    }

    if (this.createdPaymentIds.length > 0) {
      await this.bulkDelete('payments', this.createdPaymentIds).catch((e) => {
        console.warn(`Warning: failed to clean up payments: ${e}`)
      })
      this.createdPaymentIds = []
    }
    if (this.createdInvoiceIds.length > 0) {
      await this.bulkDelete('invoices', this.createdInvoiceIds).catch((e) => {
        console.warn(`Warning: failed to clean up invoices: ${e}`)
      })
      this.createdInvoiceIds = []
    }
    if (this.createdClientIds.length > 0) {
      await this.bulkDelete('clients', this.createdClientIds).catch((e) => {
        console.warn(`Warning: failed to clean up clients: ${e}`)
      })
      this.createdClientIds = []
    }
  }

  private async bulkDelete(resource: string, ids: string[]): Promise<void> {
    await this.client.post(`/${resource}/bulk`, {
      action: 'delete',
      ids,
    })
  }
}
