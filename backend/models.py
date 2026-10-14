from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Index, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    live_url: Mapped[str | None] = mapped_column(String(500))
    github_url: Mapped[str | None] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(500))
    # Optional pipeline diagram shown on the featured card, e.g. ["Data Input", "Vector Search"]
    flow_steps: Mapped[list[str] | None] = mapped_column(JSON)
    flow_caption: Mapped[str | None] = mapped_column(String(120))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)


class Certificate(TimestampMixin, Base):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    issuer: Mapped[str] = mapped_column(String(160))
    credly_url: Mapped[str | None] = mapped_column(String(500))
    pdf_url: Mapped[str | None] = mapped_column(String(500))
    issued_on: Mapped[date | None] = mapped_column(Date)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)


class Experience(TimestampMixin, Base):
    """One table for both work experience and education (kind = 'experience' | 'education')."""

    __tablename__ = "experience"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(12), index=True)
    title: Mapped[str] = mapped_column(String(200))
    organization: Mapped[str] = mapped_column(String(200))
    period: Mapped[str | None] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)


class KnowledgeNote(TimestampMixin, Base):
    """Free-text facts the admin wants Naini (the chatbot) to know: social links, FAQs, policies."""

    __tablename__ = "knowledge"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)


class RateEvent(Base):
    """Rate-limit ledger. Lives in Postgres because serverless instances share no memory."""

    __tablename__ = "rate_events"
    __table_args__ = (Index("ix_rate_events_lookup", "bucket", "ip", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    bucket: Mapped[str] = mapped_column(String(20))
    ip: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
