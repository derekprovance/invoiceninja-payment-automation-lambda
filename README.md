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
- npm package manager
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
npm install
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
npm run compile
```

This will output the compiled JavaScript files into a deployable zip under the `dist` folder

## Integration Testing

This project includes end-to-end integration tests that run against a live InvoiceNinja instance in Docker. The tests verify payment processing scenarios including client matching, invoice allocation, and partial payment handling.

### Prerequisites for Integration Testing

- Docker and Docker Compose
- Node.js and npm

### Running Integration Tests

#### Quick Start (Recommended)

Run all tests with automatic cleanup:

```bash
make integration:test
```

This target will:
1. Generate an APP_KEY for the test environment
2. Start Docker services (MariaDB, Redis, InvoiceNinja, nginx)
3. Initialize InvoiceNinja with test credentials
4. Run all integration tests
5. Stop and clean up Docker services

#### Manual Steps

If you prefer to manage the environment manually:

```bash
# Start Docker services
docker compose --env-file .env.integration up -d

# Initialize InvoiceNinja (polls for readiness, logs in, generates docker/integration.env)
bash scripts/init-invoiceninja.sh

# Run tests
npm run test:integration

# Stop services when done
docker compose down
```

### Integration Test Coverage

The integration tests verify 5 scenarios:

| Test | Expected Result |
|------|-----------------|
| Exact client name match | Successfully marks invoice as paid |
| Contact name match | Finds client by contact first+last name |
| Multi-invoice allocation | Distributes payment across multiple unpaid invoices |
| No matching client | Returns `no_client` status |
| Client with no invoices | Returns `no_invoice` status |

Each test creates its own test data and cleans up automatically after execution.

### Troubleshooting Integration Tests

**InvoiceNinja won't start**: The `make integration:key` target may have failed to generate an APP_KEY. Check that `.env.integration` exists and contains `IN_APP_KEY=base64:...`

**Tests fail with "More than one client found" or "ECONNREFUSED" errors**: This typically indicates stale Docker volumes from a previous failed run. Clean up with:
```bash
make integration:clean
```
This removes the Docker volumes (`db_data`, `invoiceninja_public`, `invoiceninja_storage`) and network. On the next `make integration:test` run, fresh volumes will be created and InvoiceNinja will initialize properly.

**"Cannot connect to InvoiceNinja" errors**: The initialization script polls the API for up to 300 seconds to allow InvoiceNinja time for database migrations and initial setup. Ensure Docker services are fully started by checking:
```bash
docker compose ps
```
If InvoiceNinja still doesn't respond after 5 minutes, check the container logs:
```bash
docker compose logs invoiceninja
```

## Contributing

1. **Fork the Repository**: Fork the original repository and clone your fork to your machine.
2. **Create a New Branch**: Create a new branch for your changes. Name the branch descriptively.
3. **Code**: Implement your changes according to the repository guidelines.
4. **Compile and Test**: Before submitting any code, make sure to compile and test thoroughly.
5. **Pull Request**: Create a pull request to the original repository for review.

## Additional Information

- For any questions or concerns, please file an issue in the GitHub repository.
- Documentation on the Invoice Ninja API can be found [here](InvoiceNinjaAPIURL).
