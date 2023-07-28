export class ParsedSubject {
  private VALID_CHECK_REGEX =
    /(\b[A-Za-z]+\b\s\b[A-Za-z]+\b)\spaid\syou\s(\$[0-9]+\.[0-9]+)/;
  private NAME_REGEX = /(\b[A-Za-z]+\b\s\b[A-Za-z]+\b)/;
  private MONEY_REGEX = /([0-9]+\.[0-9]+)/;

  private name: string | undefined;
  private amount: number | undefined;
  private valid: boolean = false;

  constructor(private subject: string) {
    this.valid = this.parseValid(subject);

    if (this.valid) {
      this.name = this.parseName(subject);
      this.amount = this.parseAmount(subject);
    }
  }

  public getName(): string | undefined {
    return this.name;
  }

  public getAmount(): number | undefined {
    return this.amount;
  }

  public getValid(): boolean {
    return this.valid;
  }

  private parseName(subject: string): string | undefined {
    return this.parse(subject, this.NAME_REGEX);
  }

  private parseAmount(subject: string): number | undefined {
    const reg = this.parse(subject, this.MONEY_REGEX);
    if (reg) {
      return parseFloat(reg);
    }
  }

  private parseValid(subject: string): boolean {
    return !!this.parse(subject, this.VALID_CHECK_REGEX);
  }

  private parse(subject: string, regex: RegExp): string | undefined {
    const reg = subject.match(regex);
    if (reg) {
      return reg[0];
    }
  }
}
