from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import ratelimit
from ..config import settings
from ..database import get_db
from ..deps import client_ip
from ..knowledge import build_system_prompt, local_reply
from ..schemas import ChatIn, ChatOut

router = APIRouter(tags=["chat"])
log = logging.getLogger("portfolio.chat")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CHAT_LIMIT = 20  # messages
CHAT_WINDOW = 10 * 60  # per 10 minutes, per IP


@router.post("/chat", response_model=ChatOut)
def chat(payload: ChatIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    ratelimit.enforce(db, "chat", ip, limit=CHAT_LIMIT, window_seconds=CHAT_WINDOW)
    ratelimit.record(db, "chat", ip)
    db.commit()

    history = [m.model_dump() for m in payload.messages[-8:]]
    last_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")

    if not settings.groq_api_key:
        return ChatOut(reply=local_reply(db, last_user))

    try:
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": settings.groq_model,
                "messages": [{"role": "system", "content": build_system_prompt(db)}, *history],
                "temperature": 0.6,
                "max_tokens": 400,
            },
            timeout=20.0,
        )
        response.raise_for_status()
        return ChatOut(reply=response.json()["choices"][0]["message"]["content"].strip())
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        log.warning("groq call failed: %s", exc)
        return ChatOut(reply=local_reply(db, last_user))
