import axios, { AxiosInstance } from 'axios'
import { logger } from '../utils/Logger'
import {
  IInvoiceRepository,
  InvoiceAllocation,
  InvoiceNinjaClient,
  InvoiceNinjaInvoice,
} from '../interfaces/IInvoiceRepository'

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
      logger.error(`${errorMsg}: ${error}`)
      throw error
    }
  }

  public async createPayment(
    allocations: InvoiceAllocation[],
    amount: number,
    clientId: string,
    typeId: string,
  ): Promise<unknown> {
    return this.request(async () => {
      const response = await this.axiosInstance.post('/payments', {
        client_id: clientId,
        amount: amount,
        is_manual: false,
        type_id: typeId,
        invoices: allocations,
        transaction_reference: 'Lambda',
      })
      return response.data
    }, 'Error creating payment')
  }

  public async getClients(name: string): Promise<InvoiceNinjaClient[]> {
    return this.request(async () => {
      const response = await this.axiosInstance.get('/clients', {
        params: { name },
      })
      return response.data.data as InvoiceNinjaClient[]
    }, 'Error fetching clients')
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
}
