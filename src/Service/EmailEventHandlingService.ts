import { Payment } from "../Payment";
import { PaymentFactory } from "../PaymentFactory";

export class EmailEventHandlingService {
    public static handleEmailEvent(event: any): Payment | undefined {
        if (!this.isValidEvent(event)) {
            throw new Error('Event not supported for email processing');
        }

        const fromAddr = this.getFromAddr(event);
        const subject = this.getEmailSubject(event);

        const payment = PaymentFactory.createPayment(fromAddr, subject);
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
