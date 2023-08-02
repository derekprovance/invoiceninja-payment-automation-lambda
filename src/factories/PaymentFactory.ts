import { logger } from "../utils/Logger";
import { config } from "../utils/config";
import { IPayment } from "../interfaces/IPayment";
import { VenmoPayment } from "../services/payments/VenmoPayment";
import { InvalidPayment } from "../utils/errors/InvalidPayment";

export class PaymentFactory {
    public static createPayment(email: string, subject: string): IPayment | undefined {
        let payment;

        switch (email) {
            case config.paymentProcessor.venmo.email:
                logger.debug('Creating payment object for Venmo Email');
                try {
                    payment = new VenmoPayment(subject);
                } catch (ex) {
                    logger.debug(ex);
                }
                break;
            default:
                logger.debug('NOTICE: Not a handled email. Nothing to process.');
                throw new InvalidPayment(`Unhandled Email Detected: ${email}`);
        }

        return payment;
    }
}
