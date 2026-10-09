"""Tell Next.js to drop its cached copy of the public pages after an admin change."""

from __future__ import annotations

import logging

import httpx

from .config import settings

log = logging.getLogger("portfolio.revalidate")


def revalidate_site() -> bool:
    """Ping the Next.js /revalidate route. Returns whether it worked; never raises,
    because an admin save must not fail just because the cache refresh did."""
    if not settings.revalidate_secret:
        return False
    try:
        response = httpx.post(
            f"{settings.site_url}/revalidate",
            headers={"x-revalidate-secret": settings.revalidate_secret},
            timeout=4.0,
        )
        if not response.is_success:
            log.warning("revalidate returned HTTP %s", response.status_code)
        return response.is_success
    except httpx.HTTPError as exc:
        log.warning("revalidate failed: %s", exc)
        return False
