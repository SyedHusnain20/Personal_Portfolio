from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import ratelimit
from ..config import settings
from ..database import get_db
from ..deps import client_ip
from ..knowledge import EMAIL, WHATSAPP, Knowledge
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


def _local(know: Knowledge, question: str, prior: str | None) -> ChatOut:
    try:
        reply, sources = know.local_answer(question, prior)
        return ChatOut(reply=reply, sources=sources)
    except Exception:  # noqa: BLE001 - a broken fallback must never become a 500 for the visitor
        log.exception("chat: retrieval fallback failed")
        return ChatOut(reply=_static_reply())


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
    user_turns = [m["content"] for m in history if m["role"] == "user"]
    last_user = user_turns[-1] if user_turns else ""
    prior_user = user_turns[-2] if len(user_turns) > 1 else None

    try:
        know = Knowledge.load(db)
    except Exception:  # noqa: BLE001
        log.exception("chat: could not load the knowledge base")
        return ChatOut(reply=_static_reply())

    if not settings.groq_api_key:
        return _local(know, last_user, prior_user)

    try:
        focus = know.retrieve(last_user, prior_user)
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": settings.groq_model,
                "messages": [{"role": "system", "content": know.system_prompt(focus)}, *history],
                "temperature": 0.3,
                # Urdu script costs more tokens per word than English, so leave headroom.
                "max_tokens": 600,
            },
            timeout=20.0,
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"].strip()
        return ChatOut(reply=reply, sources=focus.sources)
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        log.warning("groq call failed: %s", exc)
    except Exception:  # noqa: BLE001 - prompt building or anything unexpected: log it, answer from the fallback
        log.exception("chat: unexpected failure while asking the model")
    return _local(know, last_user, prior_user)
