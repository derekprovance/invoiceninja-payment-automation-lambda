'use strict'
import { InvoiceNinjaRepository } from './src/repositories/InvoiceNinjaRepository'
import { logger } from './src/utils/Logger'
import { IPayment } from './src/interfaces/IPayment'
import { PaymentProcessingService } from './src/services/PaymentProcessingService'
import { config } from './src/utils/config'
import { EmailEventHandlingService } from './src/services/EmailEventHandlingService'
import { InvalidEventError } from './src/utils/errors/InvalidEventError'

/**
 * Lambda that takes adds a payment to invoice ninja based on a name and amount.
 *
 * @param event SES event from forwarded e-mail
 * @returns The result of the payment processing
 */
export const handler = async (event: any) => {
  let payment
  try {
    payment = EmailEventHandlingService.handleEmailEvent(event);
  } catch (ex) {
    logger.debug(ex);
    throw ex;
  }

  if (!payment) {
    logger.debug('Unhandled Payment for event.')
    return
  }

  const response = await processPayment(payment)
  logger.info(`Processing completed for ${payment.getName()}`)

  return response;
}


export const processPayment = async (payment: IPayment): Promise<any> => {
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
    paymentResult = {
      error: ex,
    }
  }

  return paymentResult;
}
