export type PaymentResult =
  | { status: 'no_client' }
  | { status: 'no_invoice' }
  | { status: 'success'; data: unknown }
