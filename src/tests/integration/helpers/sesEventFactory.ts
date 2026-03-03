import { SESEvent, Context } from 'aws-lambda'

export function buildVenmoSesEvent(
  payerName: string,
  amount: number,
): SESEvent {
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
              date: new Date().toUTCString(),
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
              functionArn:
                'arn:aws:lambda:us-east-1:123456789012:function:test',
              invocationType: 'Event',
            },
          },
        },
      },
    ],
  }
}

export function createMockContext(): Context {
  return {
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: 'test-stream',
    functionName: 'test-function',
    functionVersion: '$LATEST',
    memoryLimitInMB: '128',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
    callbackWaitsForEmptyEventLoop: false,
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }
}
