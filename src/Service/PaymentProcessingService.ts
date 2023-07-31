import { InvoiceNinjaRepository } from '../Repository/InvoiceNinjaRepository'
import { logger } from '../../Logger'
import { Payment } from '../Payment';

export class PaymentProcessingService {
  private invoiceNinjaRepository: InvoiceNinjaRepository

  constructor(invoiceNinjaRepository: InvoiceNinjaRepository) {
    this.invoiceNinjaRepository = invoiceNinjaRepository
  }

  public async processPayment(payment: Payment) {
    logger.debug(`Processing payment for ${payment.getName()}`);

    const client = await this.getClient(payment.getName());
    const invoice = await this.getInvoice(client.id, payment.getAmount());

    return await this.createPayment(invoice.id, client.id, payment.getAmount(), payment.getPaymentId());
  }

  private async createPayment(invoiceId: string, clientId: string, amount: number, paymentTypeId: string) {
    logger.trace(`Creating ${amount} payment for ${clientId} on invoice ${invoiceId} with type ${paymentTypeId}.`)

    return await this.invoiceNinjaRepository.createPayment(
      invoiceId,
      amount,
      clientId,
      paymentTypeId,
    )
  }

  private async getInvoice(clientId: string, amount: number): Promise<any> {
    const invoices = await this.invoiceNinjaRepository.listInvoices(
      amount,
      clientId,
    )

    if (!this.validateInvoice(invoices)) {
      logger.debug('NOTICE: Invalid amount of invoices found: ', invoices.length)
      throw new Error('Unable to process invoices due to invalid return results')
    }

    return invoices[0];
  }

  private async getClient(clientName: string): Promise<any> {
    const clients = await this.invoiceNinjaRepository.getClients(
      clientName,
    )

    if (!this.validClient(clients)) {
      logger.debug('NOTICE: Invalid amount of clients found: ', clients.length)
      throw new Error('Unable to process clients due to invalid return results')
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