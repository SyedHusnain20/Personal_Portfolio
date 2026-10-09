from __future__ import annotations

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from .config import settings
from .deps import get_current_admin
from .revalidate import revalidate_site
from .routers import auth, chat
from .routers.content import admin_routers, public_routers

app = FastAPI(
    title="Portfolio API",
    docs_url=None if settings.production else "/api/docs",
    openapi_url=None if settings.production else "/api/openapi.json",
    redoc_url=None,
)

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@app.middleware("http")
async def same_origin_for_writes(request: Request, call_next):
    """Defence in depth on top of SameSite=Strict cookies: browsers send Origin on
    cross-site writes, so reject any whose origin isn't ours."""
    if request.method not in _SAFE_METHODS:
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") not in settings.allowed_origins:
            return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
    return await call_next(request)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/admin/revalidate", tags=["admin"], dependencies=[Depends(get_current_admin)])
def refresh_public_site():
    """Manual 'update the public site now' button in the admin dashboard."""
    return {"revalidated": revalidate_site()}


app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
for router in (*public_routers, *admin_routers):
    app.include_router(router, prefix="/api")
