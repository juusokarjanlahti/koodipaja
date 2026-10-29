#!/usr/bin/env bash
# Smoke test: submit a tiny Python program to Judge0 and check the output.
# Usage: ./infra/judge0-smoke.sh   (reads JUDGE0_* from .env if present)
set -euo pipefail

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

URL="${JUDGE0_URL:-http://127.0.0.1:2358}"
HEADER="${JUDGE0_AUTH_HEADER:-X-Auth-Token}"
TOKEN="${JUDGE0_AUTH_TOKEN:?set JUDGE0_AUTH_TOKEN}"

echo "Checking Judge0 at $URL ..."
curl -fsS -H "$HEADER: $TOKEN" "$URL/about" >/dev/null || {
  echo "Judge0 is not responding. Is 'docker compose up -d' running?" >&2
  exit 1
}

# language_id 71 = Python 3 in Judge0 1.13.x
RESPONSE=$(curl -fsS -X POST "$URL/submissions?wait=true&base64_encoded=false" \
  -H "$HEADER: $TOKEN" -H "Content-Type: application/json" \
  -d '{"language_id":71,"source_code":"print(sum(int(x) for x in input().split()))","stdin":"2 3"}')

echo "$RESPONSE"
if echo "$RESPONSE" | grep -q '"stdout":"5\\n"'; then
  echo "OK: Judge0 ran Python and returned the expected output."
else
  echo "FAIL: unexpected response. On Ubuntu 22.04+ see docs/local-dev.md (cgroup v1)." >&2
  exit 1
fi
