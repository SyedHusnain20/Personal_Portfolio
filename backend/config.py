"""Runtime configuration, read once from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass

try:  # local-development convenience; not installed (or needed) on Vercel
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass


def normalize_db_url(url: str) -> str:
    """Neon/Vercel hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _site_url() -> str:
    explicit = os.getenv("SITE_URL")
    if explicit:
        return explicit.rstrip("/")
    prod = os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
    if prod:
        return f"https://{prod}"
    return "http://localhost:3000"


def _allowed_origins(site_url: str) -> frozenset[str]:
    origins = {site_url}
    for extra in os.getenv("ALLOWED_ORIGINS", "").split(","):
        if extra.strip():
            origins.add(extra.strip().rstrip("/"))
    if os.getenv("VERCEL_URL"):
        origins.add(f"https://{os.environ['VERCEL_URL']}")
    if not os.getenv("VERCEL"):
        origins.update({"http://localhost:3000", "http://127.0.0.1:3000"})
    return frozenset(origins)


@dataclass(frozen=True)
class Settings:
    production: bool
    database_url: str
    jwt_secret: str
    jwt_hours: int
    cookie_name: str
    groq_api_key: str
    groq_model: str
    revalidate_secret: str
    site_url: str
    allowed_origins: frozenset[str]

    @property
    def cookie_secure(self) -> bool:
        return self.production


def load_settings() -> Settings:
    production = bool(os.getenv("VERCEL")) or os.getenv("ENVIRONMENT") == "production"
    database_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or "sqlite:///./dev.db"
    )
    jwt_secret = os.getenv("JWT_SECRET", "")
    if production and len(jwt_secret) < 32:
        raise RuntimeError("JWT_SECRET must be set to a random string of 32+ characters")
    site_url = _site_url()
    return Settings(
        production=production,
        database_url=normalize_db_url(database_url),
        jwt_secret=jwt_secret or "dev-only-secret-do-not-use-in-production",
        jwt_hours=int(os.getenv("JWT_HOURS", "12")),
        cookie_name="admin_token",
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        revalidate_secret=os.getenv("REVALIDATE_SECRET", ""),
        site_url=site_url,
        allowed_origins=_allowed_origins(site_url),
    )


settings = load_settings()
