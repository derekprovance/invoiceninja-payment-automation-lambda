# InvoiceNinja Payment Automation Lambda

## Description

This AWS Lambda function is written in TypeScript and is designed to automate invoice management within Invoice Ninja. The Lambda listens for Amazon Simple Email Service (SES) events triggered by forwarded Venmo payment emails and performs the following actions:

1. Identifies the client in Invoice Ninja based on the Venmo payment email.
2. Searches for a specific invoice or the total due from all invoices for that client.
3. Marks the identified invoice(s) as paid.

This project is compatible with both self-hosted and cloud-hosted Invoice Ninja accounts and is designed for use within the AWS Lambda ecosystem.

## Prerequisites

- AWS Lambda
- AWS Simple Email Service (SES)
- Node.js (latest version)
- Yarn package manager
- Invoice Ninja account (either self-hosted or cloud-hosted)

## Dependencies

- TypeScript
- esbuild

## Getting Started

### Installation

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/derekprovance/invoiceninja-payment-automation-lambda.git
cd invoiceninja-payment-automation-lambda
```

Install required packages:

```bash
yarn install
```

### Configuration

#### AWS Configuration

1. Set up AWS Lambda and AWS Simple Email Service (SES).
2. Configure SES to trigger this Lambda function upon receiving forwarded Venmo payment emails.

#### Invoice Ninja Configuration

1. Have your Invoice Ninja account (either self-hosted or cloud-hosted) set up.
2. Keep your Invoice Ninja API credentials ready.

#### Environment Variables

Set up the environment variables for your Lambda function. Below is a table detailing the required and optional variables:

| Variable               | Description                                              | Default Value | Required |
| ---------------------- | -------------------------------------------------------- | ------------- | -------- |
| `BASE_URL`             | The URL for your Invoice Ninja instance.                 |               | true |
| `TOKEN`                | Your Invoice Ninja API token.                            |               | true |
| `VENMO_PAYMENT_GATEWAY_ID` | Payment gateway ID for Venmo in Invoice Ninja database. | `25`          | false |
| `VENMO_EMAIL`          | Optional parameter in case Venmo changes their email.    |               | true |
| `LOG_LEVEL`            | Optional log level for debugging and monitoring.         | `info`        | false |

### Compilation

Compile the TypeScript code:

```bash
yarn compile
```

This will output the compiled JavaScript files into a deployable zip under the `dist` folder

## Contributing

1. **Fork the Repository**: Fork the original repository and clone your fork to your machine.
2. **Create a New Branch**: Create a new branch for your changes. Name the branch descriptively.
3. **Code**: Implement your changes according to the repository guidelines.
4. **Compile and Test**: Before submitting any code, make sure to compile and test thoroughly.
5. **Pull Request**: Create a pull request to the original repository for review.

## Additional Information

- For any questions or concerns, please file an issue in the GitHub repository.
- Documentation on the Invoice Ninja API can be found [here](InvoiceNinjaAPIURL).
