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

  const client = await invoiceService.getClients(payment.getName() as string);

  if (!client || client.length === 0 || client.length > 1) {
    console.log("Invalid clients found: ", client.length);
    return;
  }

  const invoices = await invoiceService.listInvoices(
    payment.getAmount() as number,
    client[0].id
  );

  if (!invoices || invoices.length === 0 || invoices.length > 1) {
    console.log("Invalid invoices found: ", invoices.length);
    return;
  }

  const makePayment = await invoiceService.createPayment(
    invoices[0].id,
    payment.getAmount() as number,
    client[0].id,
    subject
  );

  return makePayment;
};
