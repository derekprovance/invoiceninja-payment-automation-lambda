export interface InvoiceNinjaContact {
  first_name: string
  last_name: string
}

export interface InvoiceNinjaClient {
  id: string
  name: string
  is_deleted?: boolean
  contacts: InvoiceNinjaContact[]
}

export interface InvoiceNinjaInvoice {
  id: string
  amount: number
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
  ): Promise<unknown>
  getClients(name: string): Promise<InvoiceNinjaClient[]>
  listInvoices(clientId: string): Promise<InvoiceNinjaInvoice[]>
}
