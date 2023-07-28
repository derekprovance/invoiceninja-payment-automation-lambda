"use strict";
import { InvoiceService } from "./InvoiceService";
import { ParsedSubject } from "./ParsedSubject";

export const handler = async (event: any) => {
  const fromAddr = event.Records[0].ses.mail.source;
  if (fromAddr !== "venmo@venmo.com") {
    return;
  }
  const subject = event.Records[0].ses.mail.commonHeaders.subject;

  const payment = new ParsedSubject(subject);
  if (!payment.getValid() || payment.getAmount() === undefined) {
    return;
  }

  const invoices = new InvoiceService(
    process.env.baseURL ?? "",
    process.env.token ?? ""
  ).listInvoices(payment.getAmount() as number);

  console.log(invoices);

  return null;
};
