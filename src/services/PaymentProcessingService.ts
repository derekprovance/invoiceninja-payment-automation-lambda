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

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0)
    const surplus = payment.getAmount() - totalAllocated
    if (surplus > CURRENCY_EPSILON) {
      logger.info(
        `Payment $${payment.getAmount()} exceeds invoices by $${surplus.toFixed(2)}; creating credit for client ${client.id}.`,
      )
      await this.invoiceNinjaRepository.createCredit(client.id, surplus)
    }

    return { status: 'success', data }
  }

  private allocatePayment(
    invoices: InvoiceNinjaInvoice[],
    paymentAmount: number,
  ): InvoiceAllocation[] {
    // Pass 1: exact match — if exactly one invoice equals the payment amount, pay only it.
    const exactMatches = invoices.filter(
      (inv) => Math.abs(inv.amount - paymentAmount) <= CURRENCY_EPSILON,
    )
    if (exactMatches.length === 1) {
      return [{ invoice_id: exactMatches[0].id, amount: exactMatches[0].amount }]
    }

    // Pass 2: no unique exact match — pay oldest invoice first.
    const sorted = [...invoices].sort((a, b) => {
      const dateA = a.date ?? ''
      const dateB = b.date ?? ''
      if (dateA !== dateB) return dateA < dateB ? -1 : 1
      return (a.created_at ?? 0) - (b.created_at ?? 0)
    })

    const allocations: InvoiceAllocation[] = []
    let remaining = paymentAmount

    for (const invoice of sorted) {
      if (remaining <= 0) break
      const applied = Math.min(invoice.amount, remaining)
      allocations.push({ invoice_id: invoice.id, amount: applied })
      remaining -= applied
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
    // The list endpoint omits the contacts array; fetch individual details
    // for any candidate that doesn't already have contacts populated.
    const candidatesWithContacts = await Promise.all(
      clients.map((c) => {
        if (c.contacts && c.contacts.length > 0) return Promise.resolve(c)
        return this.invoiceNinjaRepository.getClientById(c.id)
      }),
    )

    // Invoice Ninja stores contacts in priority order, but we check all of them
    // to avoid missing a match when the primary contact is not the payer.
    const contactMatches = candidatesWithContacts.filter((c) =>
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
