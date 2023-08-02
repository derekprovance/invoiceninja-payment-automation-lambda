import { InvoiceNinjaRepository } from '../repositories/InvoiceNinjaRepository'
import { logger } from '../utils/Logger'
import { IPayment } from '../interfaces/IPayment';
import { InvoiceNotFoundError } from '../utils/errors/InvoiceNotFoundError';
import { ClientNotFoundError } from '../utils/errors/ClientNotFoundError';
import { UnhandledScenarioError } from '../utils/errors/UnhandledScenarioError';

export class PaymentProcessingService {
  private invoiceNinjaRepository: InvoiceNinjaRepository

  constructor(invoiceNinjaRepository: InvoiceNinjaRepository) {
    this.invoiceNinjaRepository = invoiceNinjaRepository
  }

  public async processPayment(payment: IPayment) {
    logger.debug(`Processing payment for ${payment.getName()}`);

    const client = await this.getClient(payment.getName());
    const invoice = await this.getInvoice(client.id, payment.getAmount());

    return await this.createPayment(invoice.id, client.id, payment.getAmount(), payment.getPaymentId());
  }

  private async createPayment(invoiceId: string, clientId: string, amount: number, paymentTypeId: string) {
    logger.info(`Creating a payment ($${amount}) for ${clientId} on invoice ${invoiceId} with type ${paymentTypeId}.`)

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

    const result = invoices.find((invoice: any) => invoice.amount === amount);

    if (!result) {
      throw new InvoiceNotFoundError(`Invoice not found for amount: ${amount}`)
    }

    return result
  }

  private async getClient(clientName: string): Promise<any> {
    const clients = await this.invoiceNinjaRepository.getClients(
      clientName,
    )

    if (!this.hasClient(clients)) {
      throw new ClientNotFoundError('Unable to process clients due to invalid return results');
    }

    if (clients.length > 1) {
      throw new UnhandledScenarioError('More than one client was found.')
    }

    return clients[0];
  }

  private hasClient = (client: any): boolean => {
    return client && client.length === 1
  }
}
