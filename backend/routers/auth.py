from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ratelimit
from ..config import settings
from ..database import get_db
from ..deps import client_ip, get_current_admin
from ..models import User
from ..schemas import LoginIn
from ..security import create_token, dummy_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

LOGIN_LIMIT = 5  # failed attempts
LOGIN_WINDOW = 15 * 60  # per 15 minutes, per IP


@router.post("/login")
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    ratelimit.enforce(db, "login", ip, limit=LOGIN_LIMIT, window_seconds=LOGIN_WINDOW)

    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    password_ok = verify_password(payload.password, user.password_hash if user else dummy_hash())
    if user is None or not password_ok:
        ratelimit.record(db, "login", ip)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    ratelimit.clear(db, "login", ip)
    db.commit()
    response.set_cookie(
        key=settings.cookie_name,
        value=create_token(user.id),
        max_age=settings.jwt_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/",
    )
    return {"email": user.email}


@router.post("/logout", status_code=204, response_class=Response)
def logout(response: Response):
    response.delete_cookie(settings.cookie_name, path="/")
    response.status_code = 204
    return response


@router.get("/me")
def me(user: User = Depends(get_current_admin)):
    return {"email": user.email}
