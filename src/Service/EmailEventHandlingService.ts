import { logger } from "../../Logger";
import { config } from "../../config";
import { Payment } from "../Payment";
import { VenmoPayment } from "../VenmoPayment";

export class EmailEventHandlingService {
    public static handleEmailEvent(event: any): Payment | undefined {
        if (!this.isValidEvent(event)) {
            throw new Error('Event not supported for email processing');
        }

        const fromAddr = this.getFromAddr(event);
        const subject = this.getEmailSubject(event);

        let payment;
        try {
            payment = this.getPaymentObjByEmail(fromAddr, subject);
            if (!payment) {
                throw new Error(`Unable to process payment: ${JSON.stringify({
                    from: fromAddr,
                    subject
                })}`)
            }
        } catch (ex) {
            logger.debug(ex);
        }

        return payment;
    }

    private static getPaymentObjByEmail(email: string, subject: string): Payment {
        let payment: Payment;

        switch (email) {
            case config.paymentProcessor.venmo.email: {
                logger.debug('Creating payment object for Venmo Email')
                payment = new VenmoPayment(subject)
                break;
            }
            default: {
                logger.debug('NOTICE: Not a handled email. Nothing to process.')
                throw new Error(`Unhandled Email: ${email}`)
            }
        }

        return payment;
    }

    private static getFromAddr(event: any): string {
        return event.Records[0].ses.mail.source;
    }

    private static getEmailSubject(event: any): string {
        return event.Records[0].ses.mail.commonHeaders.subject
    }

    private static isValidEvent(event: any): boolean {
        return (
            event?.Records &&
            event.Records.length > 0 &&
            event.Records[0].ses?.mail?.source &&
            event.Records[0].ses?.mail?.commonHeaders?.subject
        )
    }
}
