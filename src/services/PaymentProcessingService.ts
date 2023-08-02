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
    const invoices = await this.getInvoicesByAmount(client.id, payment.getAmount());

    return await this.createPayment(invoices, client.id, payment.getAmount(), payment.getPaymentId());
  }

  private async createPayment(invoices: any[], clientId: string, amount: number, paymentTypeId: string) {
    logger.info(`Creating a payment ($${amount}) for ${clientId} on invoices ${JSON.stringify(invoices)} with type ${paymentTypeId}.`)

    return await this.invoiceNinjaRepository.createPayment(
      invoices,
      amount,
      clientId,
      paymentTypeId,
    )
  }

  private async getInvoicesByAmount(clientId: string, amount: number): Promise<any[]> {
    const invoices = await this.invoiceNinjaRepository.listInvoices(
      amount,
      clientId,
    )

    let result = this.findSingleInvoice(invoices, amount);
    if(result) {
      return [result];
    }

    if (this.isInvoiceTotal(invoices, amount)) {
      return invoices;
    } else {
      throw new InvoiceNotFoundError('Unable to find invoice with total');
    }
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

  private findSingleInvoice(invoices: [any], amount: number): any | null {
    const invoice = invoices.find((invoice: any) => invoice.amount === amount);
    return invoice || null;
  }

  private isInvoiceTotal(invoices: [any], amount: number): boolean {
    const total = invoices.reduce((acc, invoice) => {
      return acc + invoice.amount
    }, 0);

    return total === amount;
  }
}
