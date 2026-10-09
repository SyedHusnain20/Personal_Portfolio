"""Fixed-window rate limiting backed by Postgres (serverless instances share no memory)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .models import RateEvent


def _now() -> datetime:
    return datetime.now(timezone.utc)


def enforce(db: Session, bucket: str, ip: str, *, limit: int, window_seconds: int) -> None:
    """Raise 429 if `ip` already has `limit` events in `bucket` within the window."""
    since = _now() - timedelta(seconds=window_seconds)
    count = db.scalar(
        select(func.count())
        .select_from(RateEvent)
        .where(RateEvent.bucket == bucket, RateEvent.ip == ip, RateEvent.created_at >= since)
    )
    if (count or 0) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a few minutes and try again.",
            headers={"Retry-After": str(window_seconds)},
        )


def record(db: Session, bucket: str, ip: str) -> None:
    db.add(RateEvent(bucket=bucket, ip=ip))
    # Opportunistic cleanup keeps the table tiny.
    db.execute(delete(RateEvent).where(RateEvent.created_at < _now() - timedelta(days=1)))


def clear(db: Session, bucket: str, ip: str) -> None:
    db.execute(delete(RateEvent).where(RateEvent.bucket == bucket, RateEvent.ip == ip))
