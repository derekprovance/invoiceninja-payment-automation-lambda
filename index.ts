'use strict'
import { InvoiceService } from './InvoiceNinjaService'
import { logger } from './Logger'
import { Payment } from './Payment'
import { PaymentProcessingService } from './PaymentProcessingService'

export const handler = async (event: any) => {
  if (!isValidEvent(event)) {
    logger.debug('NOTICE: Invalid event detected')
    return
  }

  const fromAddr = getFromAddr(event);
  const subject = getEmailSubject(event);

  if (fromAddr !== 'venmo@venmo.com') {
    logger.debug('NOTICE: Not a venmo email')
    return
  }

  const payment = new Payment(subject)
  if (!payment.isValid()) {
    logger.info('NOTICE: Not a valid payment notification', subject)
    return
  }

  const invoiceService = new InvoiceService(
    process.env.baseURL as string,
    process.env.token as string,
  )
  const paymentProcessingService = new PaymentProcessingService(
    invoiceService,
    payment,
  )

  const paymentResult = paymentProcessingService.processPayment(
    payment.getName(),
    payment.getAmount(),
  )

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
