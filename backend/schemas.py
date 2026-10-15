from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def _safe_url(value: str | None) -> str | None:
    """Allow http(s) URLs and site-relative paths only (blocks javascript:, data:, etc.)."""
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if len(value) > 500:
        raise ValueError("must be at most 500 characters")
    if value.startswith("/") and not value.startswith("//"):
        return value
    parsed = urlparse(value)
    if parsed.scheme in ("http", "https") and parsed.netloc:
        return value
    raise ValueError("must be an http(s) URL or a site-relative path like /Certificates/file.pdf")


Url = Annotated[str | None, AfterValidator(_safe_url)]
Tag = Annotated[str, Field(min_length=1, max_length=40)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Projects ────────────────────────────────────────────────────────────────
class ProjectIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=2000)
    tags: list[Tag] = Field(default_factory=list, max_length=12)
    live_url: Url = None
    github_url: Url = None
    image_url: Url = None
    flow_steps: list[Tag] | None = Field(default=None, max_length=6)
    flow_caption: str | None = Field(default=None, max_length=120)
    is_featured: bool = False
    is_published: bool = True


class ProjectOut(ORMModel):
    id: int
    slug: str
    title: str
    category: str
    description: str
    tags: list[str]
    live_url: str | None
    github_url: str | None
    image_url: str | None
    flow_steps: list[str] | None
    flow_caption: str | None
    is_featured: bool
    is_published: bool
    sort_order: int
    updated_at: datetime | None


# ── Certificates ────────────────────────────────────────────────────────────
class CertificateIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    issuer: str = Field(min_length=1, max_length=160)
    credly_url: Url = None
    pdf_url: Url = None
    issued_on: date | None = None
    is_published: bool = True


class CertificateOut(ORMModel):
    id: int
    title: str
    issuer: str
    credly_url: str | None
    pdf_url: str | None
    issued_on: date | None
    is_published: bool
    sort_order: int
    updated_at: datetime | None


# ── Experience / education ──────────────────────────────────────────────────
class ExperienceIn(BaseModel):
    kind: Literal["experience", "education"]
    title: str = Field(min_length=1, max_length=200)
    organization: str = Field(min_length=1, max_length=200)
    period: str | None = Field(default=None, max_length=60)
    description: str | None = Field(default=None, max_length=1000)
    is_published: bool = True


class ExperienceOut(ORMModel):
    id: int
    kind: str
    title: str
    organization: str
    period: str | None
    description: str | None
    is_published: bool
    sort_order: int
    updated_at: datetime | None


# ── Chatbot knowledge notes ─────────────────────────────────────────────────
class KnowledgeIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=2000)
    is_published: bool = True


class KnowledgeOut(ORMModel):
    id: int
    title: str
    content: str
    is_published: bool
    sort_order: int
    updated_at: datetime | None


# ── Auth / chat ─────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class ReorderIn(BaseModel):
    ids: list[int] = Field(max_length=200)


class ChatMessage(BaseModel):
    # Only user/assistant roles are accepted, so clients can't inject a "system" message.
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=600)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)


class ChatOut(BaseModel):
    reply: str
    # Labels of the facts the answer was based on, e.g. "Education · BS in Software Engineering".
    sources: list[str] = Field(default_factory=list)
