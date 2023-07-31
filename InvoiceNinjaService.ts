import axios from 'axios'
import { logger } from './Logger'

export class InvoiceNinjaService {
  private PAYMENT_GATEWAY_ID = '25'

  private baseURL: string
  private token: string

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL
    this.token = token
  }

  public async createPayment(
    invoiceId: string,
    amount: number,
    clientId: string,
  ) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/payments`,
        {
          client_id: clientId,
          amount: amount,
          is_manual: false,
          type_id: this.PAYMENT_GATEWAY_ID,
          invoices: [
            {
              invoice_id: invoiceId,
              amount: amount,
            },
          ],
          transaction_reference: 'Lambda',
        },
        {
          headers: {
            'X-API-TOKEN': `${this.token}`,
            'X-Requested-With': 'XMLHttpRequest',
          },
        },
      )

      return response.data
    } catch (error) {
      logger.error(`Error creating payment: ${error}`)
      throw error
    }
  }

  public async getClients(name: string) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/clients`, {
        headers: {
          'X-API-TOKEN': `${this.token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        params: {
          includes: name,
        },
      })

      return response.data.data
    } catch (error) {
      logger.error(`Error fetching invoices: ${error}`)
      throw error
    }
  }

  public async listInvoices(amount: number, clientId: string) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/invoices`, {
        headers: {
          'X-API-TOKEN': `${this.token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        params: {
          is_deleted: false,
          filter: amount,
          client_status: 'unpaid',
          client_id: clientId,
        },
      })

      return response.data.data
    } catch (error) {
      logger.error(`Error fetching invoices: ${error}`)
      throw error
    }
  }
}
