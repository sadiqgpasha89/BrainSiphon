"""Authentication (who are you) and authorisation (what may you do).

AUTH_MODE=local  The service is its own token issuer: POST /auth/token checks a username and password and returns a signed
                 JWT (HS256, JWT_SECRET). Users and roles come from configs/users.yaml; each password comes from the
                 environment variable USER_<NAME>_PASSWORD, so no secret is ever committed.
AUTH_MODE=oidc   Tokens come from your identity provider (Entra ID, Okta, Keycloak, Cognito). The service only verifies
                 them: RS256 against OIDC_JWKS_URL, or against a PEM public key in JWT_PUBLIC_KEY_FILE, checking issuer and
                 audience. Roles are read from the `roles` claim. /auth/token is disabled.

Authorisation is role-based: every route states the roles it accepts with `Depends(require("analyst", "ml-admin"))`.
"""

from __future__ import annotations

import hmac
import os
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .config import load_yaml, settings

_oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str
    roles: frozenset[str]

    def has(self, *roles: str) -> bool:
        return bool(self.roles & set(roles))


def _env_key(username: str) -> str:
    return "USER_" + re.sub(r"[^A-Z0-9]", "_", username.upper()) + "_PASSWORD"


def users() -> dict[str, dict[str, Any]]:
    return {u["username"]: u for u in load_yaml("configs/users.yaml")["users"]}


def authenticate(username: str, password: str) -> Principal | None:
    user = users().get(username)
    expected = os.environ.get(_env_key(username), "")
    # compare even when the user is unknown, so the response time does not reveal which usernames exist
    ok = hmac.compare_digest(password.encode(), (expected or "\x00unset").encode())
    if user is None or not expected or not ok:
        return None
    return Principal(subject=username, roles=frozenset(user["roles"]))


def issue_token(principal: Principal) -> str:
    s = settings()
    if s.auth_mode != "local":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "token issuance is disabled: authenticate with the identity provider")
    if len(s.jwt_secret) < 32:
        raise RuntimeError("JWT_SECRET must be set to at least 32 characters (run `make setup`)")
    now = int(time.time())
    claims = {
        "sub": principal.subject,
        "roles": sorted(principal.roles),
        "iat": now,
        "exp": now + s.token_ttl_seconds,
        "iss": "bsref-local",
    }
    return jwt.encode(claims, s.jwt_secret, algorithm="HS256")


@lru_cache(maxsize=1)
def _jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=True)


def verify_token(token: str) -> Principal:
    s = settings()
    try:
        if s.auth_mode == "local":
            claims = jwt.decode(token, s.jwt_secret, algorithms=["HS256"], issuer="bsref-local")
        else:
            if s.jwt_public_key_file:
                key: Any = Path(s.jwt_public_key_file).read_text()
            elif s.oidc_jwks_url:
                key = _jwks_client(s.oidc_jwks_url).get_signing_key_from_jwt(token).key
            else:
                raise RuntimeError("AUTH_MODE=oidc needs OIDC_JWKS_URL or JWT_PUBLIC_KEY_FILE")
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=s.oidc_issuer or None,
                audience=s.oidc_audience or None,
                options={"verify_aud": bool(s.oidc_audience), "verify_iss": bool(s.oidc_issuer)},
            )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, f"invalid token: {exc}", headers={"WWW-Authenticate": "Bearer"}
        ) from exc
    roles = claims.get("roles") or []
    if isinstance(roles, str):
        roles = roles.split()
    return Principal(subject=str(claims.get("sub", "")), roles=frozenset(roles))


def current_principal(token: str | None = Depends(_oauth2)) -> Principal:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token", headers={"WWW-Authenticate": "Bearer"})
    return verify_token(token)


def require(*roles: str) -> Callable[..., Principal]:
    """FastAPI dependency: 401 without a valid token, 403 when the caller holds none of the accepted roles."""

    def dep(principal: Principal = Depends(current_principal)) -> Principal:
        if not principal.has(*roles):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"requires one of the roles: {', '.join(roles)}")
        return principal

    return dep
