import { logger } from "../Logger";
import { config } from "../config";
import { Payment } from "./Payment";
import { VenmoPayment } from "./VenmoPayment";

export class PaymentFactory {
    public static createPayment(email: string, subject: string): Payment {
        switch (email) {
            case config.paymentProcessor.venmo.email:
                logger.debug('Creating payment object for Venmo Email');
                return new VenmoPayment(subject);
            default:
                logger.debug('NOTICE: Not a handled email. Nothing to process.');
                throw new Error(`Unhandled Email: ${email}`);
        }
    }
}
