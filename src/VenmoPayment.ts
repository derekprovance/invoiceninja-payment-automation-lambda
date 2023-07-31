import { config } from "../config"
import { logger } from "../Logger"
import { Payment } from "./Payment"

export class VenmoPayment implements Payment {
    private NAME_REGEX = /(\b[A-Za-z]+\b\s\b[A-Za-z]+\b)/
    private MONEY_REGEX = /([0-9]+(\.[0-9]+)?)/

    private name: string
    private amount: number

    constructor(originalText: string) {
        this.name = this.parseName(originalText)
        this.amount = this.parseAmount(originalText)
    }

    public getName(): string {
        return this.name
    }

    public getAmount(): number {
        return this.amount
    }

    public getPaymentId(): string {
        return config.paymentProcessor.venmo.gatewayId;
    }

    public isValid(): boolean {
        return (this.name && this.amount) ? true : false
    }

    private parseName(subject: string): string {
        return this.parse(subject, this.NAME_REGEX)
    }

    private parseAmount(subject: string): number {
        const reg = this.parse(subject, this.MONEY_REGEX)
        if (reg) {
            return parseFloat(reg)
        }

        throw new Error(`Unable to process monitary amount ${subject}`);
    }

    private parse(subject: string, regex: RegExp): string {
        const reg = subject.match(regex)
        if (reg) {
            return reg[0]
        } else {
            logger.error(`Error parsing ${subject} with ${regex}`);
            throw new Error(`Error parsing ${subject} with ${regex}`);
        }
    }
}
