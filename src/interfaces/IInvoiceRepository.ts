export type ContactCustomField = 'custom_value1' | 'custom_value2' | 'custom_value3' | 'custom_value4'

export interface InvoiceNinjaContact {
  first_name: string
  last_name: string
  custom_value1?: string
  custom_value2?: string
  custom_value3?: string
  custom_value4?: string
}

export interface InvoiceNinjaClient {
  id: string
  name: string
  is_deleted?: boolean
  contacts?: InvoiceNinjaContact[]
}

export interface InvoiceNinjaInvoice {
  id: string
  amount: number // invoice total (original)
  balance: number // remaining unpaid amount — used for allocation
  date?: string // Invoice date "YYYY-MM-DD"; primary sort key
  created_at?: number // Unix timestamp; tiebreaker when dates are equal
}

export interface InvoiceAllocation {
  invoice_id: string
  amount: number
}

export interface IInvoiceRepository {
  createPayment(
    allocations: InvoiceAllocation[],
    amount: number,
    clientId: string,
    typeId: string,
    traceId: string,
  ): Promise<unknown>
  getClients(name: string): Promise<InvoiceNinjaClient[]>
  getClientById(id: string): Promise<InvoiceNinjaClient>
  listInvoices(clientId: string): Promise<InvoiceNinjaInvoice[]>
  createCredit(clientId: string, amount: number, traceId: string): Promise<unknown>
}

export const INVOICE_STATUS_PAID = '4'
