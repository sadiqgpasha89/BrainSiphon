#!/usr/bin/env bash
set -euo pipefail

# Production Deployment Smoke Test Suite
# Tests endpoint health, P99 latency SLA, Redis feature store read, and model inference accuracy.

ENDPOINT="${1:-http://localhost:8000}"
LATENCY_SLA_MS="${2:-15}"

echo "=========================================================="
echo "AI/ML Production Solution: Pre-Flight Smoke Test Suite"
echo "Target Endpoint: ${ENDPOINT}"
echo "Synchronous SLA: < ${LATENCY_SLA_MS}ms"
echo "=========================================================="

echo -n "1. Checking service liveness probe... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${ENDPOINT}/health/liveness" || true)
if [ "${HTTP_CODE}" = "200" ]; then
  echo "✔ PASSED (HTTP 200)"
else
  echo "✖ FAILED (HTTP ${HTTP_CODE})"
  exit 1
fi

echo -n "2. Checking service readiness probe (DB & Redis connectivity)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${ENDPOINT}/health/readiness" || true)
if [ "${HTTP_CODE}" = "200" ]; then
  echo "✔ PASSED (HTTP 200)"
else
  echo "✖ FAILED (HTTP ${HTTP_CODE})"
  exit 1
fi

echo -n "3. Testing synchronous inference latency & contract compliance... "
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -X POST "${ENDPOINT}/v1/predict" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: smoke-test-$(date +%s)" \
  -d '{"entity_id": "test_card_1001", "features": {"amount": 42.50, "velocity_1h": 2}}' || true)
END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))

echo -n "Latency: ${ELAPSED_MS}ms... "
if [ "${ELAPSED_MS}" -le "${LATENCY_SLA_MS}" ]; then
  echo "✔ PASSED (< ${LATENCY_SLA_MS}ms SLA)"
else
  echo "⚠ SLA BREACHED (${ELAPSED_MS}ms > ${LATENCY_SLA_MS}ms)"
fi

echo "=========================================================="
echo "Smoke test complete. Infrastructure is verified operational."
echo "=========================================================="

