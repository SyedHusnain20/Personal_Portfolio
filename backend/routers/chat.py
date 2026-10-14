from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import ratelimit
from ..config import settings
from ..database import get_db
from ..deps import client_ip
from ..knowledge import EMAIL, WHATSAPP, build_system_prompt, local_reply
from ..schemas import ChatIn, ChatOut

router = APIRouter(tags=["chat"])
log = logging.getLogger("portfolio.chat")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CHAT_LIMIT = 20  # messages
CHAT_WINDOW = 10 * 60  # per 10 minutes, per IP


def _static_reply() -> str:
    """Last resort: no database, no model. A visitor still gets a way to reach Hasnain."""
    return (
        "I'm having trouble answering right now. You can reach Hasnain directly at "
        f"**{EMAIL}** or on WhatsApp: {WHATSAPP}."
    )


def _safe_local_reply(db: Session, question: str) -> str:
    try:
        return local_reply(db, question)
    except Exception:  # noqa: BLE001 - a broken fallback must never become a 500 for the visitor
        log.exception("chat: keyword fallback failed")
        return _static_reply()


@router.post("/chat", response_model=ChatOut)
def chat(payload: ChatIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    try:
        ratelimit.enforce(db, "chat", ip, limit=CHAT_LIMIT, window_seconds=CHAT_WINDOW)
        ratelimit.record(db, "chat", ip)
        db.commit()
    except HTTPException:
        raise  # the 429 "too many messages" answer
    except Exception:  # noqa: BLE001 - e.g. database unreachable: don't call the model, don't 500
        log.exception("chat: could not check the rate limit")
        return ChatOut(reply=_static_reply())

    history = [m.model_dump() for m in payload.messages[-8:]]
    last_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")

    if not settings.groq_api_key:
        return ChatOut(reply=_safe_local_reply(db, last_user))

    try:
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": settings.groq_model,
                "messages": [{"role": "system", "content": build_system_prompt(db)}, *history],
                "temperature": 0.4,
                # Urdu script costs more tokens per word than English, so leave headroom.
                "max_tokens": 600,
            },
            timeout=20.0,
        )
        response.raise_for_status()
        return ChatOut(reply=response.json()["choices"][0]["message"]["content"].strip())
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        log.warning("groq call failed: %s", exc)
    except Exception:  # noqa: BLE001 - prompt building or anything unexpected: log it, answer from the fallback
        log.exception("chat: unexpected failure while asking the model")
    return ChatOut(reply=_safe_local_reply(db, last_user))
