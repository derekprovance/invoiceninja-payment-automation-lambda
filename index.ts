"use strict";
import { InvoiceService } from "./InvoiceService";
import { ParsedSubject } from "./ParsedSubject";

export const handler = async (event: any) => {
  const fromAddr = event.Records[0].ses.mail.source;
  if (fromAddr !== "venmo@venmo.com") {
    console.log("Not a venmo email");
    return;
  }
  const subject = event.Records[0].ses.mail.commonHeaders.subject;

  const payment = new ParsedSubject(subject);
  if (!payment.getValid() || payment.getAmount() === undefined) {
    console.log("Not a valid payment notification");
    return;
  }

  const invoiceService = new InvoiceService(
    process.env.baseURL as string,
    process.env.token as string
  );

  const client = await invoiceService.getClient(payment.getName() as string);
  const invoices = await invoiceService.listInvoices(
    payment.getAmount() as number,
    client.id
  );

  //TODO - make a final call to save the invoice as paid
  return null;
};
