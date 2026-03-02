export interface InvoiceNinjaContact {
  first_name: string
  last_name: string
}

export interface InvoiceNinjaClient {
  id: string
  name: string
  contacts: InvoiceNinjaContact[]
}

export interface InvoiceNinjaInvoice {
  id: string
  amount: number
}

export interface IInvoiceRepository {
  createPayment(
    invoices: InvoiceNinjaInvoice[],
    amount: number,
    clientId: string,
    typeId: string,
  ): Promise<unknown>
  getClients(name: string): Promise<InvoiceNinjaClient[]>
  listInvoices(clientId: string): Promise<InvoiceNinjaInvoice[]>
}
