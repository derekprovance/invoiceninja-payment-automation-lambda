import { InvoiceNinjaService } from './InvoiceNinjaService'
import { logger } from './Logger'
import { Payment } from './Payment'

export class PaymentProcessingService {
  private invoiceNinjaService: InvoiceNinjaService
  private payment: Payment

  constructor(invoiceNinjaService: InvoiceNinjaService, payment: Payment) {
    this.invoiceNinjaService = invoiceNinjaService
    this.payment = payment
  }

  public async processPayment(name: string, amount: number) {
    const client = await this.getClient(this.payment.getName());
    const invoice = await this.getInvoice(client.id, this.payment.getAmount());

    return await this.createPayment(invoice.id, client.id, this.payment.getAmount());
  }

  private async createPayment(invoiceId: string, clientId: string, amount: number) {
    return await this.invoiceNinjaService.createPayment(
      invoiceId,
      amount,
      clientId,
    )
  }

  private async getInvoice(clientId: string, amount: number): Promise<any> {
    const invoices = await this.invoiceNinjaService.listInvoices(
      amount,
      clientId,
    )

    if (!this.validateInvoice(invoices)) {
      logger.debug('NOTICE: Invalid amount of invoices found: ', invoices.length)
      return
    }

    return invoices[0];
  }

  private async getClient(clientName: string): Promise<any> {
    const clients = await this.invoiceNinjaService.getClients(
      clientName,
    )

    if (!this.validClient(clients)) {
      logger.debug('NOTICE: Invalid amount of clients found: ', clients.length)
      return
    }

    return clients[0];
  }

  private validClient = (client: any): boolean => {
    return client && client.length === 1
  }

  private validateInvoice = (invoice: any): boolean => {
    return invoice && invoice.length === 1
  }
}
