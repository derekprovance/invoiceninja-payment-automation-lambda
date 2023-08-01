'use strict'
import { InvoiceNinjaRepository } from './src/Repository/InvoiceNinjaRepository'
import { logger } from './Logger'
import { Payment } from './src/Payment'
import { PaymentProcessingService } from './src/Service/PaymentProcessingService'
import { config } from './config'
import { EmailEventHandlingService } from './src/Service/EmailEventHandlingService'

/**
 * Lambda that takes adds a payment to invoice ninja based on a name and amount.
 *
 * @param event SES event from forwarded e-mail
 * @returns The result of the payment processing
 */
export const handler = async (event: any) => {
  const payment = EmailEventHandlingService.handleEmailEvent(event);

  if (!payment) {
    logger.debug('Unhandled Payment for event.')
    return
  }

  if (!payment.isValid()) {
    logger.debug(`Invalid payment: ${JSON.stringify({ payment })}`);
    return
  }

  const response = await processPayment(payment)
  logger.info(`Processing completed for ${payment.getName()}`)

  return response;
}


export const processPayment = async (payment: Payment): Promise<any> => {
  const paymentProcessingService = new PaymentProcessingService(
    new InvoiceNinjaRepository(
      config.baseUrl as string,
      config.token as string,
    ),
  )

  let paymentResult;
  try {
    paymentResult = await paymentProcessingService.processPayment(payment);
  } catch (ex) {
    logger.error(ex);
  }

  return paymentResult;
}
