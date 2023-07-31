'use strict'
import { InvoiceNinjaRepository } from './src/Repository/InvoiceNinjaRepository'
import { logger } from './src/Logger'
import { Payment } from './src/Payment'
import { PaymentProcessingService } from './src/Service/PaymentProcessingService'
import { config } from './config'

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
  if (!isValidEvent(event)) {
    logger.error('NOTICE: Invalid event detected')
    throw new Error(`Invalid event sent to lambda`);
  }

  const fromAddr = getFromAddr(event);
  const subject = getEmailSubject(event);

  if (fromAddr !== 'venmo@venmo.com') {
    logger.debug('NOTICE: Not a venmo email. Nothing to process.')
    return
  }

  const payment = new Payment(subject)
  if (!payment.isValid()) {
    logger.info('NOTICE: Not a valid payment notification', subject)
    return
  }

  return await processPayment(payment)
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
    paymentResult = await paymentProcessingService.processPayment(
      payment.getName(),
      payment.getAmount(),
    )
  } catch (ex) {
    logger.error(ex);
  }

  return paymentResult;
}

export const getFromAddr = (event: any): string => {
  return event.Records[0].ses.mail.source;
}

export const getEmailSubject = (event: any): string => {
  return event.Records[0].ses.mail.commonHeaders.subject
}

export const isValidEvent = (event: any): boolean => {
  return (
    event?.Records &&
    event.Records.length > 0 &&
    event.Records[0].ses?.mail?.source &&
    event.Records[0].ses?.mail?.commonHeaders?.subject
  )
}
