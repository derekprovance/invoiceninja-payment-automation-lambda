export class InvalidPayment extends Error {
    constructor(message: string) {
        super(message);
    }
}
