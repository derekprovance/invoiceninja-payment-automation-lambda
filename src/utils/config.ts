import { IPaymentProcessor } from "../interfaces/IPaymentProcessor";

/**
 * Configuration for Invoice Ninja Payment Automation
 * 
 * @property BASE_URL - The base URL for your instance of Invoice Ninja
 * @property VENMO_PAYMENT_GATEWAY_ID - ID representing a payment processing type in Invoice Ninja (default: '25')
 * @property TOKEN - The API Token for your Invoice Ninja instance
 * @property LOG_LEVEL - Pino log level for lambda logging (default: 'info')
 * @property VENMO_EMAIL - Venmo email address (default: 'venmo@venmo.com')
 */
export const config = {
    baseUrl: process.env.BASE_URL ?? 'your_default_base_url',
    paymentProcessor: {
        venmo: {
            gatewayId: process.env.VENMO_PAYMENT_GATEWAY_ID ?? '25',
            email: process.env.VENMO_EMAIL ?? 'venmo@venmo.com',
        } as IPaymentProcessor,
    },
    token: process.env.TOKEN,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    appName: 'invoiceninja-payment-automation',
}
