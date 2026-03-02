import { logger } from '../utils/Logger'
import { IPayment } from '../interfaces/IPayment'
import { UnhandledScenarioError } from '../utils/errors/UnhandledScenarioError'
import {
  IInvoiceRepository,
  InvoiceAllocation,
  InvoiceNinjaClient,
  InvoiceNinjaInvoice,
} from '../interfaces/IInvoiceRepository'
import { PaymentResult } from '../types/PaymentResult'

const CURRENCY_EPSILON = 0.001

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

    const invoices = await this.invoiceNinjaRepository.listInvoices(client.id)

    if (invoices.length === 0) {
      logger.info(`No invoices found for client ${payment.getName()}`)
      return { status: 'no_invoice' }
    }

    const allocations = this.allocatePayment(invoices, payment.getAmount())

    const data = await this.createPayment(
      allocations,
      client.id,
      payment.getAmount(),
      payment.getPaymentId(),
    )
    return { status: 'success', data }
  }

  private allocatePayment(
    invoices: InvoiceNinjaInvoice[],
    paymentAmount: number,
  ): InvoiceAllocation[] {
    const sorted = [...invoices].sort((a, b) => a.amount - b.amount)
    const allocations: InvoiceAllocation[] = []
    let remaining = paymentAmount

    for (const invoice of sorted) {
      if (remaining <= 0) break
      const applied = Math.min(invoice.amount, remaining)
      allocations.push({ invoice_id: invoice.id, amount: applied })
      remaining -= applied
    }

    if (remaining > CURRENCY_EPSILON) {
      logger.info(
        `Payment amount $${paymentAmount} exceeds invoice total by $${remaining.toFixed(2)}; surplus will create a credit.`,
      )
    }

    return allocations
  }

  private async createPayment(
    allocations: InvoiceAllocation[],
    clientId: string,
    amount: number,
    paymentTypeId: string,
  ): Promise<unknown> {
    logger.info(
      `Creating a payment ($${amount}) for ${clientId} on invoices ${allocations.map((a) => a.invoice_id)} with type ${paymentTypeId}.`,
    )
    return await this.invoiceNinjaRepository.createPayment(
      allocations,
      amount,
      clientId,
      paymentTypeId,
    )
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
    if (nameMatches.length > 1) {
      throw new UnhandledScenarioError(
        `More than one client was found with the name ${clientName}`,
      )
    }

    // Pass 2: exact match on any contact's first_name + last_name.
    // Invoice Ninja stores contacts in priority order, but we check all of them
    // to avoid missing a match when the primary contact is not the payer.
    const contactMatches = clients.filter((c) =>
      c.contacts?.some(
        (contact) =>
          normalizeName(`${contact.first_name} ${contact.last_name}`) ===
          normalizedSearch,
      ),
    )
    if (contactMatches.length === 1) return contactMatches[0]
    if (contactMatches.length > 1) {
      throw new UnhandledScenarioError(
        `More than one client was found with the name ${clientName}`,
      )
    }

    return null
  }
}
