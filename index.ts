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
 * FUTURE TODO: It might be worth considering making this event a generic name and amount instead. By doing so
 * we'll allow for much simpler lambdas that are in charge of parsing various inputs from payment processors
 * all routed through this lambda
 * 
 * @param event SES event from forwarded e-mail
 * @returns 
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
