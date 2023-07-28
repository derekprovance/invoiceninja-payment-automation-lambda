import axios from "axios";

export class InvoiceService {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  public async getClient(name: string) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/clients`, {
        headers: {
          "X-API-TOKEN": `${this.token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
        params: {
          includes: name,
        },
      });

      if (response.data?.data.length !== 1) {
        throw new Error(`Error regarding clients returned for ${name}`);
      }
      return response.data.data[0];
    } catch (error) {
      console.error(`Error fetching invoices: ${error}`);
      throw error;
    }
  }

  public async listInvoices(amount: number, clientID: number) {
    console.log('clientId', clientID);
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/invoices`, {
        headers: {
          "X-API-TOKEN": `${this.token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
        params: {
          is_deleted: false,
          filter: amount,
          client_status: "unpaid",
          client_id: clientID,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching invoices: ${error}`);
      throw error;
    }
  }
}
