import { logger } from '../utils/Logger'
import { IPayment } from '../interfaces/IPayment'
import { UnhandledScenarioError } from '../utils/errors/UnhandledScenarioError'
import {
  IInvoiceRepository,
  InvoiceNinjaClient,
  InvoiceNinjaInvoice,
} from '../interfaces/IInvoiceRepository'
import { PaymentResult } from '../types/PaymentResult'

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export class PaymentProcessingService {
  private invoiceNinjaRepository: IInvoiceRepository

  constructor(invoiceNinjaRepository: IInvoiceRepository) {
    this.invoiceNinjaRepository = invoiceNinjaRepository
  }

  public async processPayment(payment: IPayment): Promise<PaymentResult> {
    logger.debug(`Processing payment for ${payment.getName()}`)

    const client = await this.getClient(payment.getName())

    if (!client) {
      logger.info(`No client was found for payment ${payment.getName()}`)
      return { status: 'no_client' }
    }

    const invoices = await this.getInvoicesByAmount(
      client.id,
      payment.getAmount(),
    )

    if (!invoices) {
      logger.info(
        `No invoice was found for client ${payment.getName()} with an amount of ${payment.getAmount()}`,
      )
      return { status: 'no_invoice' }
    }

    const data = await this.createPayment(
      invoices,
      client.id,
      payment.getAmount(),
      payment.getPaymentId(),
    )
    return { status: 'success', data }
  }

  private async createPayment(
    invoices: InvoiceNinjaInvoice[],
    clientId: string,
    amount: number,
    paymentTypeId: string,
  ): Promise<unknown> {
    logger.info(
      `Creating a payment ($${amount}) for ${clientId} on invoices ${invoices.map((invoice) => invoice.id)} with type ${paymentTypeId}.`,
    )
    return await this.invoiceNinjaRepository.createPayment(
      invoices,
      amount,
      clientId,
      paymentTypeId,
    )
  }

  private async getInvoicesByAmount(
    clientId: string,
    amount: number,
  ): Promise<InvoiceNinjaInvoice[] | null> {
    const invoices = await this.invoiceNinjaRepository.listInvoices(clientId)

    const result = this.findSingleInvoice(invoices, amount)
    if (result) {
      return [result]
    }

    if (this.isInvoiceTotal(invoices, amount)) {
      return invoices
    }

    return null
  }

  private async getClient(
    clientName: string,
  ): Promise<InvoiceNinjaClient | null> {
    const clients = await this.invoiceNinjaRepository.getClients(clientName)
    if (clients.length === 0) return null

    const normalizedSearch = normalizeName(clientName)

    // Pass 1: exact match on stored client `name` field
    const nameMatches = clients.filter(
      (c) => normalizeName(c.name) === normalizedSearch,
    )
    if (nameMatches.length === 1) return nameMatches[0]

    // Pass 2: exact match on contacts[0] first_name + last_name
    const contactMatches = clients.filter((c) => {
      const contact = c.contacts?.[0]
      if (!contact) return false
      return (
        normalizeName(`${contact.first_name} ${contact.last_name}`) ===
        normalizedSearch
      )
    })
    if (contactMatches.length === 1) return contactMatches[0]

    // Ambiguous — more than one exact match in either pass
    if (nameMatches.length > 1 || contactMatches.length > 1) {
      throw new UnhandledScenarioError(
        `More than one client was found with the name ${clientName}`,
      )
    }

    return null
  }

  private findSingleInvoice(
    invoices: InvoiceNinjaInvoice[],
    amount: number,
  ): InvoiceNinjaInvoice | null {
    const invoice = invoices.find(
      (invoice) => Math.abs(invoice.amount - amount) < 0.001,
    )
    return invoice ?? null
  }

  private isInvoiceTotal(
    invoices: InvoiceNinjaInvoice[],
    amount: number,
  ): boolean {
    const total = invoices.reduce((acc, invoice) => acc + invoice.amount, 0)
    return Math.abs(total - amount) < 0.001
  }
}
