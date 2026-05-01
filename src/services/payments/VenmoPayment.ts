import { logger } from '../../utils/Logger'
import { IPayment } from '../../interfaces/IPayment'
import { ParserError } from '../../utils/errors/ParserError'
import { InvalidPaymentError } from '../../utils/errors/InvalidPaymentError'

export class VenmoPayment implements IPayment {
  private static readonly NAME_REGEX = /^(.+?)\s+paid\b/
  private static readonly MONEY_REGEX = /\$([0-9]+(?:\.[0-9]{1,2})?)/

  private name: string
  private amount: number
  private gatewayId: string

  constructor(originalText: string, gatewayId: string) {
    this.gatewayId = gatewayId
    this.name = this.parseName(originalText)
    this.amount = this.parseAmount(originalText)

    if (!this.isValid()) {
      logger.error({ name: this.name, amount: this.amount }, 'Invalid payment')
      throw new InvalidPaymentError('Invalid Venmo payment')
    }
  }

  public getName(): string {
    return this.name
  }

  public getAmount(): number {
    return this.amount
  }

  public getPaymentId(): string {
    return this.gatewayId
  }

  private isValid(): boolean {
    return Boolean(this.name) && this.amount > 0
  }

  private parseName(subject: string): string {
    return this.parse(subject, VenmoPayment.NAME_REGEX)[1].trim()
  }

  private parseAmount(subject: string): number {
    return parseFloat(this.parse(subject, VenmoPayment.MONEY_REGEX)[1])
  }

  private parse(subject: string, regex: RegExp): RegExpMatchArray {
    const reg = subject.match(regex)
    if (reg) {
      return reg
    } else {
      logger.error(
        { regex: regex.toString(), subject },
        'Error parsing email subject',
      )
      throw new ParserError(`Error parsing ${subject} with ${regex}`)
    }
  }
}
