# Invoice Ninja Payment Automation Lambda - Reviewer Notes

## Architecture
- AWS Lambda triggered by SES email events (Venmo payment notifications)
- Parses sender email + subject line to extract payer name and amount
- Looks up client in Invoice Ninja API, matches to unpaid invoices, creates payment
- Stack: TypeScript, esbuild bundler, axios for HTTP, vitest for testing, pino logger

## Key Files
- `index.ts` - Lambda handler entry point
- `src/services/EmailEventHandlingService.ts` - SES event parsing
- `src/factories/PaymentFactory.ts` - Payment object factory (email -> IPayment)
- `src/services/payments/VenmoPayment.ts` - Venmo email subject parser
- `src/services/PaymentProcessingService.ts` - Core business logic (client lookup, invoice matching, payment creation)
- `src/repositories/InvoiceNinjaRepository.ts` - Invoice Ninja API client
- `src/utils/config.ts` - Environment-based configuration with requireEnv()

## Conventions
- Free functions preferred over static-only classes
- AppError base class for all custom errors (sets this.name)
- IInvoiceRepository interface enables DI and test mocking
- PaymentResult discriminated union for process outcomes
- Float comparison with epsilon (0.001) for currency matching
- `as Record<string, IPaymentProcessor>` cast on config.paymentProcessor
