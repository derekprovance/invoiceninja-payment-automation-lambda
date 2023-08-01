export interface IPayment {
  getName(): string
  getAmount(): number
  isValid(): boolean
  getPaymentId(): string
}
