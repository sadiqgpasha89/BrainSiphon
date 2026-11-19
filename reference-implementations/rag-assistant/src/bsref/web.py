"""The application shell every implementation's API is built on: request ids, access logs, metrics, health, auth routes,
error mapping and the static consuming application under /ui."""

from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict, deque
from collections.abc import Callable
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text

from . import auth, db
from .hitl import ReviewError
from .observability import Metrics, configure_logging
from .registry import RegistryError
from .validation import DataValidationError

log = logging.getLogger("bsref.http")
_SHARED = Path(__file__).parent / "static"
_MAX_FAILS, _WINDOW = 5, 300.0


def create_app(
    title: str,
    version: str,
    ui_dir: Path | None = None,
    readiness: Callable[[], dict[str, bool]] | None = None,
) -> FastAPI:
    configure_logging()
    db.init_schema()
    app = FastAPI(title=title, version=version)
    app.state.metrics = Metrics()
    fails: dict[str, deque[float]] = defaultdict(deque)

    @app.middleware("http")
    async def _observe(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = rid
        t0 = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            log.exception("unhandled error", extra={"request_id": rid, "path": request.url.path})
            response = JSONResponse({"detail": "internal error", "request_id": rid}, status_code=500)
        elapsed = time.perf_counter() - t0
        route = getattr(request.scope.get("route"), "path", "unmatched")
        m: Metrics = app.state.metrics
        m.requests.labels(request.method, route, str(response.status_code)).inc()
        m.latency.labels(route).observe(elapsed)
        response.headers["x-request-id"] = rid
        if route not in ("/metrics", "/healthz", "/readyz"):
            log.info(
                "request",
                extra={"request_id": rid, "method": request.method, "route": route, "status": response.status_code,
                       "ms": round(elapsed * 1000, 2)},
            )
        return response

    @app.exception_handler(ReviewError)
    async def _review_error(_: Request, exc: ReviewError):
        return JSONResponse({"detail": str(exc)}, status_code=exc.code)

    @app.exception_handler(RegistryError)
    async def _registry_error(_: Request, exc: RegistryError):
        return JSONResponse({"detail": str(exc)}, status_code=409)

    @app.exception_handler(DataValidationError)
    async def _validation_error(_: Request, exc: DataValidationError):
        return JSONResponse({"detail": str(exc)}, status_code=422)

    @app.get("/healthz", tags=["ops"])
    def healthz() -> dict[str, str]:
        """Liveness: the process is up."""
        return {"status": "ok"}

    @app.get("/readyz", tags=["ops"])
    def readyz() -> Response:
        """Readiness: the database answers and the implementation's own dependencies (e.g. a production model) are present."""
        checks: dict[str, bool] = {}
        try:
            with db.engine().connect() as conn:
                conn.execute(text("SELECT 1"))
            checks["database"] = True
        except Exception:  # noqa: BLE001
            checks["database"] = False
        if readiness:
            try:
                checks.update(readiness())
            except Exception:  # noqa: BLE001
                checks["dependencies"] = False
        ok = all(checks.values())
        return JSONResponse({"status": "ready" if ok else "not-ready", "checks": checks}, status_code=200 if ok else 503)

    @app.get("/metrics", tags=["ops"], include_in_schema=False)
    def metrics() -> Response:
        return Response(generate_latest(app.state.metrics.registry), media_type=CONTENT_TYPE_LATEST)

    @app.post("/auth/token", tags=["auth"])
    def token(form: OAuth2PasswordRequestForm = Depends()) -> dict[str, Any]:
        """OAuth2 password grant for the local profile. Five failed attempts lock a username for five minutes."""
        now = time.time()
        q = fails[form.username]
        while q and now - q[0] > _WINDOW:
            q.popleft()
        if len(q) >= _MAX_FAILS:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too many failed attempts; try again later")
        principal = auth.authenticate(form.username, form.password)
        if principal is None:
            q.append(now)
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "incorrect username or password")
        q.clear()
        with db.tx() as conn:
            db.audit(conn, principal.subject, "login", "auth")
        return {"access_token": auth.issue_token(principal), "token_type": "bearer", "roles": sorted(principal.roles)}

    @app.get("/auth/me", tags=["auth"])
    def me(principal: auth.Principal = Depends(auth.current_principal)) -> dict[str, Any]:
        return {"subject": principal.subject, "roles": sorted(principal.roles)}

    app.mount("/_shared", StaticFiles(directory=_SHARED), name="shared")
    if ui_dir is not None:
        app.mount("/ui", StaticFiles(directory=ui_dir, html=True), name="ui")

        @app.get("/", include_in_schema=False)
        def _root() -> RedirectResponse:
            return RedirectResponse("/ui/")

    return app


def request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "")
