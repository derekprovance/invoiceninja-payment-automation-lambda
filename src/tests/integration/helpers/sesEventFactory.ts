import { SESEvent } from 'aws-lambda'

export function buildVenmoSesEvent(payerName: string, amount: number): SESEvent {
  const subject = `${payerName} paid you $${amount.toFixed(2)}`
  const from = 'Venmo <venmo@venmo.com>'
  const messageId = `test-${Date.now()}`

  return {
    Records: [
      {
        eventSource: 'aws:ses',
        eventVersion: '1.0',
        ses: {
          mail: {
            timestamp: new Date().toISOString(),
            source: 'venmo@venmo.com',
            messageId,
            destination: ['recipient@example.com'],
            headersTruncated: false,
            headers: [
              { name: 'From', value: from },
              { name: 'Subject', value: subject },
            ],
            commonHeaders: {
              returnPath: 'venmo@venmo.com',
              from: [from],
              to: ['recipient@example.com'],
              messageId: `<${messageId}@venmo.com>`,
              subject,
            },
          },
          receipt: {
            timestamp: new Date().toISOString(),
            processingTimeMillis: 100,
            recipients: ['recipient@example.com'],
            spamVerdict: { status: 'PASS' },
            virusVerdict: { status: 'PASS' },
            spfVerdict: { status: 'PASS' },
            dkimVerdict: { status: 'PASS' },
            dmarcVerdict: { status: 'PASS' },
            action: {
              type: 'Lambda',
              functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
              invocationType: 'Event',
            },
          },
        },
      },
    ],
  }
}
