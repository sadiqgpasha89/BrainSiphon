# API gateway configuration

| Item | Value |
|------|-------|
| Gateway product (Apigee, Kong, AWS API Gateway, Azure APIM, Envoy/Istio, NGINX, other) | |
| Base URL per environment | |
| Authentication on each route (OAuth2 JWT validation, mTLS, API key, HMAC signature) | |
| Expected token issuer, audience, scopes | |
| Rate limits and quotas per client | |
| Request size and timeout limits (must exceed the solution's p99 budget) | |
| Retry behaviour of the gateway (it can double-send: the solution must be idempotent) | |
| IP allow-listing and WAF rules | |
| Required headers (`X-Request-Id`, tenant id, idempotency key) | |
| Error format returned to callers | |

| Route | Method | Auth | Scope | Timeout | Rate limit | Idempotent? | Request id propagated? |
|-------|--------|------|-------|---------|------------|-------------|------------------------|
| | | | | | | | |

## Proof

`http[]` for reachability, `api_auth[]` for token and probe, `tls[]` for certificate expiry and the minimum TLS version, and
`service_accounts[]` for allowed and denied routes.
