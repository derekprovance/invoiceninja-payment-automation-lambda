import { SESEvent } from 'aws-lambda'
import { IPayment } from '../interfaces/IPayment'
import { createPayment } from '../factories/PaymentFactory'
import { InvalidEventError } from '../utils/errors/InvalidEventError'

export function handleEmailEvent(event: SESEvent): IPayment {
  if (!isValidEvent(event)) {
    throw new InvalidEventError('Event is not an SES event')
  }

  const fromAddr = getFromAddr(event)
  const subject = getEmailSubject(event)

  return createPayment(fromAddr, subject)
}

function getFromAddr(event: SESEvent): string {
  return event.Records[0].ses.mail.commonHeaders.from![0]
}

function getEmailSubject(event: SESEvent): string {
  return event.Records[0].ses.mail.commonHeaders.subject!
}

function isValidEvent(event: SESEvent): boolean {
  return (
    event?.Records &&
    event.Records.length > 0 &&
    Boolean(event.Records[0].ses?.mail?.commonHeaders?.from?.length) &&
    Boolean(event.Records[0].ses?.mail?.commonHeaders?.subject)
  )
}
