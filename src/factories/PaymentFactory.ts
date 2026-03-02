import { logger } from '../utils/Logger'
import { config } from '../utils/config'
import { IPayment } from '../interfaces/IPayment'
import { VenmoPayment } from '../services/payments/VenmoPayment'
import { InvalidPaymentError } from '../utils/errors/InvalidPaymentError'

export function createPayment(email: string, subject: string): IPayment {
  if (email.includes(config.paymentProcessor['venmo'].email)) {
    logger.debug('Creating payment object for Venmo Email')
    return new VenmoPayment(subject, config.paymentProcessor['venmo'].gatewayId)
  }
  logger.debug('NOTICE: Not a handled email. Nothing to process.')
  throw new InvalidPaymentError(`Unhandled Email Detected: ${email}`)
}
