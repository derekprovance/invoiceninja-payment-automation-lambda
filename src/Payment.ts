export interface Payment {
  getName(): string
  getAmount(): number
  isValid(): boolean
  getPaymentId(): string
}
