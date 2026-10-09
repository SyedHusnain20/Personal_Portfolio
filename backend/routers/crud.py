# NOTE: deliberately no `from __future__ import annotations` here. FastAPI reads the
# route signatures below, and they reference the schema classes passed into the factory.
import re
from typing import Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin
from ..revalidate import revalidate_site
from ..schemas import ReorderIn


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:100].strip("-") or "item"


def unique_slug(db: Session, model, base: str, exclude_id: Optional[int] = None) -> str:
    base = slugify(base)
    slug, n = base, 2
    while True:
        query = select(model.id).where(model.slug == slug)
        if exclude_id is not None:
            query = query.where(model.id != exclude_id)
        if db.scalar(query) is None:
            return slug
        slug, n = f"{base}-{n}", n + 1


def build_resource_routers(
    *,
    name: str,
    model,
    create_schema,
    out_schema,
    on_save: Optional[Callable[[Session, object], None]] = None,
):
    """Return (public_router, admin_router) exposing CRUD for one table.

    Public:  GET  /api/{name}                 published rows, in display order
    Admin:   GET  /api/admin/{name}           every row (drafts included)
             POST /api/admin/{name}           create (appended to the end)
             PUT  /api/admin/{name}/{id}      replace fields
             DELETE /api/admin/{name}/{id}
             POST /api/admin/{name}/reorder   {"ids": [...]} sets display order
    """
    public = APIRouter(prefix=f"/{name}", tags=[name])
    admin = APIRouter(
        prefix=f"/admin/{name}",
        tags=[f"admin: {name}"],
        dependencies=[Depends(get_current_admin)],
    )
    has_slug = hasattr(model, "slug")

    def ordered(stmt):
        return stmt.order_by(model.sort_order, model.id)

    def get_or_404(db: Session, item_id: int):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail="Not found")
        return obj

    @public.get("", response_model=list[out_schema])
    def list_public(db: Session = Depends(get_db)):
        return db.scalars(ordered(select(model).where(model.is_published.is_(True)))).all()

    @admin.get("", response_model=list[out_schema])
    def list_all(db: Session = Depends(get_db)):
        return db.scalars(ordered(select(model))).all()

    @admin.post("", response_model=out_schema, status_code=201)
    def create(payload: create_schema, db: Session = Depends(get_db)):
        data = payload.model_dump()
        slug_hint = data.pop("slug", None)
        obj = model(**data)
        if has_slug:
            obj.slug = unique_slug(db, model, slug_hint or data["title"])
        obj.sort_order = (db.scalar(select(func.max(model.sort_order))) or -1) + 1
        db.add(obj)
        db.flush()
        if on_save:
            on_save(db, obj)
        db.commit()
        db.refresh(obj)
        revalidate_site()
        return obj

    @admin.post("/reorder", status_code=204, response_class=Response)
    def reorder(payload: ReorderIn, db: Session = Depends(get_db)):
        rows = {
            r.id: r for r in db.scalars(select(model).where(model.id.in_(payload.ids))).all()
        }
        for position, item_id in enumerate(payload.ids):
            if item_id in rows:
                rows[item_id].sort_order = position
        db.commit()
        revalidate_site()
        return Response(status_code=204)

    @admin.put("/{item_id}", response_model=out_schema)
    def update(item_id: int, payload: create_schema, db: Session = Depends(get_db)):
        obj = get_or_404(db, item_id)
        data = payload.model_dump()
        slug_hint = data.pop("slug", None)
        for key, value in data.items():
            setattr(obj, key, value)
        if has_slug and slug_hint and slug_hint != obj.slug:
            obj.slug = unique_slug(db, model, slug_hint, exclude_id=obj.id)
        if on_save:
            on_save(db, obj)
        db.commit()
        db.refresh(obj)
        revalidate_site()
        return obj

    @admin.delete("/{item_id}", status_code=204, response_class=Response)
    def delete(item_id: int, db: Session = Depends(get_db)):
        db.delete(get_or_404(db, item_id))
        db.commit()
        revalidate_site()
        return Response(status_code=204)

    return public, admin
