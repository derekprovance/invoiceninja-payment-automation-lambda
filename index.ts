import { SESEvent, Context } from 'aws-lambda'
import { InvoiceNinjaRepository } from './src/repositories/InvoiceNinjaRepository'
import { logger } from './src/utils/Logger'
import { PaymentProcessingService } from './src/services/PaymentProcessingService'
import { config } from './src/utils/config'
import { handleEmailEvent } from './src/services/EmailEventHandlingService'
import packageJson from './package.json'

const repository = new InvoiceNinjaRepository(config.baseUrl, config.token)
const paymentProcessingService = new PaymentProcessingService(
  repository,
  config.paymentProcessor.venmo.usernameContactField,
)

/**
 * Formats a trace ID for log correlation and debugging.
 * Format: Lambda:<version>:<awsRequestId>
 * @param awsRequestId The AWS Lambda request ID from the context
 * @returns A formatted trace ID string combining version and request ID
 */
function formatTraceId(awsRequestId: string): string {
  const version = packageJson.version || '0.0.0'
  return `Lambda:${version}:${awsRequestId}`
}

/**
 * Lambda that adds a payment to Invoice Ninja based on a name and amount.
 *
 * @param event SES event from forwarded e-mail
 * @param context Lambda context
 * @returns The result of the payment processing
 */
export const handler = async (event: SESEvent, context: Context) => {
  const traceId = formatTraceId(context.awsRequestId)
  const messageId = event.Records[0]?.ses?.mail?.messageId
  logger.info({ traceId, messageId }, 'Processing email event')

  try {
    const payment = handleEmailEvent(event)
    const result = await paymentProcessingService.processPayment(payment, traceId)
    logger.info({ traceId, status: result.status }, `Processing completed for ${payment.getName()}`)
    return result
  } catch (error) {
    logger.error({ err: error, traceId }, 'Handler error')
    throw error
  }
}
