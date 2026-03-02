import { SESEvent } from 'aws-lambda'
import { InvoiceNinjaRepository } from './src/repositories/InvoiceNinjaRepository'
import { logger } from './src/utils/Logger'
import { PaymentProcessingService } from './src/services/PaymentProcessingService'
import { config } from './src/utils/config'
import { handleEmailEvent } from './src/services/EmailEventHandlingService'

const repository = new InvoiceNinjaRepository(config.baseUrl, config.token)
const paymentProcessingService = new PaymentProcessingService(repository)

/**
 * Lambda that adds a payment to Invoice Ninja based on a name and amount.
 *
 * @param event SES event from forwarded e-mail
 * @returns The result of the payment processing
 */
export const handler = async (event: SESEvent) => {
  try {
    const payment = handleEmailEvent(event)
    const result = await paymentProcessingService.processPayment(payment)
    logger.debug(
      `Processing completed for ${payment.getName()} with status: ${result.status}`,
    )
    return result
  } catch (error) {
    logger.error(`Handler error: ${error}`)
    throw error
  }
}
