import { config } from "../config";
import { logger } from "../Logger";
import { Payment } from "./Payment";

export class VenmoPayment implements Payment {
    private static readonly NAME_REGEX = /([A-Za-z]+\s[A-Za-z]+) paid you/;
    private static readonly MONEY_REGEX = /\$([0-9]+(\.[0-9]{1,2})?)/;

    private name: string;
    private amount: number;

    constructor(originalText: string) {
        this.name = this.parseName(originalText);
        this.amount = this.parseAmount(originalText);

        if (!this.isValid()) {
            logger.error(`Invalid payment. Name: ${this.name}, Amount: ${this.amount}`);
            throw new Error("Invalid Venmo payment");
        }
    }

    public getName(): string {
        return this.name;
    }

    public getAmount(): number {
        return this.amount;
    }

    public getPaymentId(): string {
        return config.paymentProcessor.venmo.gatewayId;
    }

    public isValid(): boolean {
        return Boolean(this.name) && this.amount >= 0;
    }

    private parseName(subject: string): string {
        const match = this.parse(subject, VenmoPayment.NAME_REGEX);
        return match ? match[1] : "";
    }

    private parseAmount(subject: string): number {
        const result = this.parse(subject, VenmoPayment.MONEY_REGEX);
        return result ? parseFloat(result[1]) : 0;
    }

    private parse(subject: string, regex: RegExp): RegExpMatchArray | null {
        const reg = subject.match(regex);
        if (reg) {
            return reg;
        } else {
            logger.error(`Error parsing ${subject} with ${regex}`);
            throw new Error(`Error parsing ${subject} with ${regex}`);
        }
    }
}
