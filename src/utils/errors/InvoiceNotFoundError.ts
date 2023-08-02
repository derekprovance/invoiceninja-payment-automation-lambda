export class InvoiceNotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}
