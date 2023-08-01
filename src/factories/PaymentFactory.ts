import { logger } from "../utils/Logger";
import { config } from "../utils/config";
import { IPayment } from "../interfaces/IPayment";
import { VenmoPayment } from "../VenmoPayment";

export class PaymentFactory {
    public static createPayment(email: string, subject: string): IPayment {
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
