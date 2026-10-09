from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import settings

_is_postgres = settings.database_url.startswith("postgresql")

if _is_postgres:
    # Neon's pooled endpoint is PgBouncer in transaction mode, so:
    #  - keep our own pool tiny (serverless instances are short-lived),
    #  - ping before reuse (Neon suspends idle connections),
    #  - disable psycopg3 server-side prepared statements (they break under PgBouncer).
    engine = create_engine(
        settings.database_url,
        pool_size=1,
        max_overflow=0,
        pool_recycle=240,
        pool_pre_ping=True,
        connect_args={"prepare_threshold": None},
    )
else:  # local SQLite for development and tests
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
