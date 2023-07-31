'use strict'
import { InvoiceNinjaService } from './InvoiceNinjaService'
import { logger } from './Logger'
import { Payment } from './Payment'
import { PaymentProcessingService } from './PaymentProcessingService'
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

  const invoiceService = new InvoiceNinjaService(
    config.baseUrl as string,
    config.token as string,
  )
  const paymentProcessingService = new PaymentProcessingService(
    invoiceService,
  )

  let paymentResult;
  try {
    paymentResult = paymentProcessingService.processPayment(
      payment.getName(),
      payment.getAmount(),
    )
  } catch (ex) {
    logger.error(ex);
  }

  return paymentResult
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
