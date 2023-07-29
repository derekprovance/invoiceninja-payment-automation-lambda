import axios from "axios";

export class InvoiceService {
  private PAYMENT_GATEWAY_ID = "25";

  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  public async createPayment(
    invoiceId: string,
    amount: number,
    clientId: string,
    notes: string,
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
          private_notes: notes,
        },
        {
          headers: {
            "X-API-TOKEN": `${this.token}`,
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error creating payment: ${error}`);
      throw error;
    }
  }

  public async getClients(name: string) {
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

      return response.data.data;
    } catch (error) {
      console.error(`Error fetching invoices: ${error}`);
      throw error;
    }
  }

  public async listInvoices(amount: number, clientID: number) {
    console.log("clientId", clientID);
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

      return response.data.data;
    } catch (error) {
      console.error(`Error fetching invoices: ${error}`);
      throw error;
    }
  }
}
