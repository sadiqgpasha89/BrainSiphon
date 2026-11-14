# Identity provider configuration

Two separate identity planes. Record both; do not reuse one for the other.

## A. Workforce identity (people: analysts, clinicians, planners, agents)

| Item | Value |
|------|-------|
| Provider (Entra ID, Okta, Ping, Keycloak, ADFS, other) | |
| Protocol (OIDC authorization code with PKCE / SAML 2.0) | |
| Issuer URL / SAML metadata URL | |
| Application registration owner | |
| Redirect URIs (exact) | |
| Group or claim that maps to each application role | |
| MFA / conditional-access policy applied | |
| Session lifetime and re-authentication on sensitive actions | |
| Break-glass or emergency access procedure | |
| Provisioning (SCIM) or just-in-time | |

## B. Machine identity (services, switches, partners, devices)

| Item | Value |
|------|-------|
| Mechanism (OAuth2 client credentials, mTLS, workload identity: IRSA / Entra Workload ID / GKE WI, SPIFFE) | |
| Token endpoint / trust domain | |
| Audience and scopes per service | |
| Secret or key rotation period and owner | |
| Partner or device registry (each with its own credential and lifecycle) | |

## Proof

```bash
curl -s <issuer>/.well-known/openid-configuration | jq '{issuer,token_endpoint,jwks_uri,grant_types_supported}'
python3 -m bs_preflight run --config preflight.json --only idp --only api_auth
```

Feeds `idp`, `api_auth`, `service_accounts`. A `401` is an identity failure, a `403` is a permission failure: they go to different owners.
