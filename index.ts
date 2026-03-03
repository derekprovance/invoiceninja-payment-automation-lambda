import { SESEvent, Context } from 'aws-lambda'
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
 * @param context Lambda context
 * @returns The result of the payment processing
 */
export const handler = async (event: SESEvent, context: Context) => {
  const requestId = context.awsRequestId
  const messageId = event.Records[0]?.ses?.mail?.messageId
  logger.info({ requestId, messageId }, 'Processing email event')

  try {
    const payment = handleEmailEvent(event)
    const result = await paymentProcessingService.processPayment(payment, requestId)
    logger.info({ requestId, status: result.status }, `Processing completed for ${payment.getName()}`)
    return result
  } catch (error) {
    logger.error({ err: error, requestId }, 'Handler error')
    throw error
  }
}
