# InvoiceNinja Payment Automation Lambda - Architectural Memory

## Overview
AWS Lambda (Node 22, TypeScript, esbuild) that receives SES email events, parses Venmo payment notifications, and creates payments in InvoiceNinja REST API v1.

## Architecture
- **Entry:** `index.ts` - Lambda handler
- **Layers:** EmailEventHandlingService -> PaymentFactory -> VenmoPayment (IPayment) -> PaymentProcessingService -> InvoiceNinjaRepository (axios)
- **Config:** `src/utils/config.ts` - env-var based singleton
- **Errors:** 4 custom error classes in `src/utils/errors/` (all identical structure)
- **Build:** esbuild bundling to dist/index.zip

## Key Decisions
- No test framework installed (no tests exist)
- Prettier configured but no format script or pre-commit hook
- `@types/aws-lambda` is a dev dependency but SESEvent type is not used
- `PaymentPayload` DTO exists but is unused

## Known Issues (from March 2026 review)
See plan file for full 24-item prioritized checklist covering:
- Silent error swallowing in PaymentFactory (critical)
- No top-level error handling in handler (critical)
- Pervasive `any` types across repository and services
- Tuple `[any]` vs array `any[]` bug in PaymentProcessingService
- Zero-amount payments pass validation
- Floating-point comparison for invoice matching
- Name regex only handles simple two-word ASCII names
