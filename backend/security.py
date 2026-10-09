from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import lru_cache

import bcrypt
import jwt

from .config import settings

_ALGORITHM = "HS256"


def _prep(password: str) -> bytes:
    # bcrypt only looks at the first 72 bytes (and newer releases refuse longer input).
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prep(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_prep(password), password_hash.encode("ascii"))
    except ValueError:
        return False


@lru_cache(maxsize=1)
def dummy_hash() -> str:
    """Verified against when the email is unknown, so timing doesn't reveal valid emails."""
    return hash_password("not-a-real-password")


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
