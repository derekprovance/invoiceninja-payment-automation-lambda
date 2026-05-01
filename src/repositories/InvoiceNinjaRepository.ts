import axios, { AxiosInstance } from 'axios'
import { logger } from '../utils/Logger'
import {
  IInvoiceRepository,
  InvoiceAllocation,
  InvoiceNinjaClient,
  InvoiceNinjaInvoice,
} from '../interfaces/IInvoiceRepository'

const isActive = (c: InvoiceNinjaClient): boolean => !c.is_deleted

export class InvoiceNinjaRepository implements IInvoiceRepository {
  private axiosInstance: AxiosInstance

  constructor(baseURL: string, token: string) {
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/api/v1`,
      headers: {
        'X-API-TOKEN': token,
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
  }

  private async request<T>(fn: () => Promise<T>, errorMsg: string): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      logger.error({ err: error }, errorMsg)
      throw error
    }
  }

  public async createPayment(
    allocations: InvoiceAllocation[],
    amount: number,
    clientId: string,
    typeId: string,
    traceId: string,
  ): Promise<unknown> {
    return this.request(async () => {
      const response = await this.axiosInstance.post('/payments', {
        client_id: clientId,
        amount: amount,
        is_manual: false,
        type_id: typeId,
        invoices: allocations,
        transaction_reference: `Lambda:${traceId}`,
      })
      return response.data
    }, 'Error creating payment')
  }

  public async getClients(name: string): Promise<InvoiceNinjaClient[]> {
    return this.request(async () => {
      // First try to get clients by name filter
      const response = await this.axiosInstance.get('/clients', {
        params: { name, per_page: 5000 },
      })
      const clientsByName = (response.data.data as InvoiceNinjaClient[]).filter(
        isActive,
      )

      // If we found clients by name, return them
      if (clientsByName.length > 0) {
        return clientsByName
      }

      // If no results by name, fetch all clients to allow contact name matching
      const allClientsResponse = await this.axiosInstance.get('/clients', {
        params: { per_page: 5000 },
      })
      return (allClientsResponse.data.data as InvoiceNinjaClient[]).filter(
        isActive,
      )
    }, 'Error fetching clients')
  }

  public async getClientById(id: string): Promise<InvoiceNinjaClient> {
    return this.request(async () => {
      const response = await this.axiosInstance.get(`/clients/${id}`)
      return response.data.data as InvoiceNinjaClient
    }, `Error fetching client ${id}`)
  }

  public async listInvoices(clientId: string): Promise<InvoiceNinjaInvoice[]> {
    return this.request(async () => {
      const response = await this.axiosInstance.get('/invoices', {
        params: {
          is_deleted: false,
          client_status: 'unpaid',
          client_id: clientId,
        },
      })
      return response.data.data as InvoiceNinjaInvoice[]
    }, 'Error fetching invoices')
  }

  public async createCredit(
    clientId: string,
    amount: number,
    traceId: string,
  ): Promise<unknown> {
    return this.request(async () => {
      const response = await this.axiosInstance.post('/credits', {
        client_id: clientId,
        line_items: [
          {
            cost: amount,
            quantity: 1,
            notes: `Overpayment surplus (trace: ${traceId})`,
          },
        ],
      })
      const credit = response.data.data as { id: string }
      await this.axiosInstance.put(`/credits/${credit.id}?mark_sent=true`, {})
      return credit
    }, 'Error creating credit')
  }
}
