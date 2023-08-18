import { IPayment } from "../interfaces/IPayment";
import { PaymentFactory } from "../factories/PaymentFactory";
import { InvalidEventError } from "../utils/errors/InvalidEventError";

export class EmailEventHandlingService {
    public static handleEmailEvent(event: any): IPayment | undefined {
        if (!this.isValidEvent(event)) {
            throw new InvalidEventError('Event is not an SES event');
        }

        const fromAddr = this.getFromAddr(event);
        const subject = this.getEmailSubject(event);

        return PaymentFactory.createPayment(fromAddr, subject);
    }

    private static getFromAddr(event: any): string {
        return event.Records[0].ses.mail.commonHeaders.from[0];
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
