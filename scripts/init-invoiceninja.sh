#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${IN_BASE_URL:-http://localhost:8000}"
EMAIL="${IN_USER_EMAIL:-admin@test.local}"
PASSWORD="${IN_PASSWORD:-TestPassword123}"
ENV_OUT="$(dirname "$0")/../docker/integration.env"

echo "Waiting for Invoice Ninja to be ready at $BASE_URL..."

MAX_WAIT=300
INTERVAL=3
elapsed=0

until curl -sf "$BASE_URL" > /dev/null; do
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "ERROR: Invoice Ninja did not become ready within ${MAX_WAIT}s" >&2
    exit 1
  fi
  echo "  Not ready yet, retrying in ${INTERVAL}s... (${elapsed}s elapsed)"
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

echo "Invoice Ninja is ready. Logging in..."

TOKEN=$(curl -sf -X POST "$BASE_URL/api/v1/login" \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.data[0].token.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: Failed to extract API token from login response" >&2
  exit 1
fi

echo "Token obtained. Renaming company to Union Aerospace Corporation..."

COMPANY_ID=$(curl -sf "$BASE_URL/api/v1/companies" \
  -H "X-API-TOKEN: $TOKEN" \
  -H "X-Requested-With: XMLHttpRequest" \
  | jq -r '.data[0].id')

if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" = "null" ]; then
  echo "ERROR: Failed to extract company ID from API response" >&2
  exit 1
fi

curl -sf -X PUT "$BASE_URL/api/v1/companies/$COMPANY_ID" \
  -H "X-API-TOKEN: $TOKEN" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Content-Type: application/json" \
  -d '{"settings": {"name": "Union Aerospace Corporation"}}' > /dev/null

echo "Company renamed. Writing $ENV_OUT..."

mkdir -p "$(dirname "$ENV_OUT")"
# Create the file with owner-read-write only before writing the token (umask-safe).
install -m 600 /dev/null "$ENV_OUT"
cat > "$ENV_OUT" <<EOF
IN_BASE_URL=$BASE_URL
IN_TOKEN=$TOKEN
EOF

echo "Done. Integration environment written to $ENV_OUT"
