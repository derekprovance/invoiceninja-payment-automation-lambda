import axios from "axios";

export class InvoiceService {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  public async listInvoices(amount: number) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/invoices`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "X-Reqeusted-With": "XMLHttpRequest",
        },
        params: {
          is_deleted: false,
          filter: amount,
          client_status: "unpaid",
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching invoices: ${error}`);
      throw error;
    }
  }
}
