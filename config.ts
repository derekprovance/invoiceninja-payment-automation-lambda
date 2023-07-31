/**
 * ==Environment Variables==
 * 
 * BASE_URL: The base url for your instance of invoice ninja
 * PAYMENT_GATEWAY_ID: A id representing a payment processing type in invoice ninja
 * PAYMENT_PROCESSOR: The name of the payment processor being parsed
 * TOKEN: The API Token for your invoice ninja instance
 * LOG_LEVEL: Pino log level for lambda logging
 * 
 */
export const config = {
    baseUrl: process.env.BASE_URL,
    paymentGatewayId: process.env.PAYMENT_GATEWAY_ID,
    paymentProcessor: process.env.PAYMENT_PROCESSOR,
    token: process.env.TOKEN,
    logLevel: process.env.LOG_LEVEL ?? 'info',
}
