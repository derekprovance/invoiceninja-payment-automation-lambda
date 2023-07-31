import { PaymentProcessor } from "./src/PaymentProcessor";

/**
 * ==Environment Variables==
 * 
 * BASE_URL: The base url for your instance of invoice ninja
 * VENMO_PAYMENT_GATEWAY_ID: A id representing a payment processing type in invoice ninja
 * TOKEN: The API Token for your invoice ninja instance
 * LOG_LEVEL: Pino log level for lambda logging
 * 
 */
export const config = {
    baseUrl: process.env.BASE_URL,
    paymentProcessor: {
        venmo: {
            gatewayId: process.env.VENMO_PAYMENT_GATEWAY_ID ?? '25',
            email: 'venmo@venmo.com'
        } as PaymentProcessor
    },
    token: process.env.TOKEN,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    appName: 'invoiceninja-payment-automation'
}
