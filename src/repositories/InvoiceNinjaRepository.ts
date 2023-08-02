import axios from 'axios'
import { logger } from '../utils/Logger'

export class InvoiceNinjaRepository {
  private axiosInstance: any;

  constructor(baseURL: string, token: string) {
    this.axiosInstance = axios.create({
      baseURL: `${baseURL}/api/v1`,
      headers: {
        'X-API-TOKEN': token,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  }

  public async createPayment(
    invoices: any[],
    amount: number,
    clientId: string,
    typeId: string,
  ): Promise<PaymentResponse> {
    try {
      const mappedInvoices = invoices.map(({ amount, invoice_id }) => ({ amount, invoice_id }));

      const response = await this.axiosInstance.post('/payments', {
        client_id: clientId,
        amount: amount,
        is_manual: false,
        type_id: typeId,
        invoices: mappedInvoices,
        transaction_reference: 'Lambda',
      });

      return response.data;
    } catch (error) {
      logger.error(`Error creating payment: ${error}`);
      throw error;
    }
  }

  public async getClients(name: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/clients', {
        params: {
          includes: name,
        },
      });

      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching clients: ${error}`);
      throw error;
    }
  }

  public async listInvoices(amount: number, clientId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/invoices', {
        params: {
          is_deleted: false,
          filter: amount,
          client_status: 'unpaid',
          client_id: clientId,
        },
      });

      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching invoices: ${error}`);
      throw error;
    }
  }
}
