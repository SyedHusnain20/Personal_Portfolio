"""What Naini knows: fixed facts from profile.py plus live rows from the database."""

from __future__ import annotations

import logging
import re

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import profile as P
from .models import Certificate, Experience, KnowledgeNote, Project

log = logging.getLogger("portfolio.knowledge")

# Re-exported: other modules (and tests) import these from here.
EMAIL = P.EMAIL
WHATSAPP = P.WHATSAPP
SITE = P.SITE

_URDU_SCRIPT = re.compile(r"[؀-ۿ]")


def _published(db: Session, model):
    return db.scalars(
        select(model).where(model.is_published.is_(True)).order_by(model.sort_order, model.id)
    ).all()


def _notes(db: Session) -> list[KnowledgeNote]:
    """Admin-written notes. If the table doesn't exist yet (code deployed before the migration
    ran), Naini carries on without them instead of failing."""
    try:
        return list(_published(db, KnowledgeNote))
    except SQLAlchemyError as exc:
        db.rollback()
        log.warning("knowledge notes unavailable: %s", exc)
        return []


def _contact_lines() -> list[str]:
    lines = [
        f"Email: {P.EMAIL}",
        f"Phone / WhatsApp: {P.PHONE_DISPLAY} ({P.WHATSAPP})",
    ]
    lines += [f"{label}: {url}" for label, url in P.SOCIALS]
    return lines


def build_system_prompt(db: Session) -> str:
    projects = _published(db, Project)
    certificates = _published(db, Certificate)
    rows = _published(db, Experience)
    notes = _notes(db)

    out: list[str] = [
        f"You are Naini, the AI assistant on {P.NAME}'s portfolio website. You answer visitors' questions about "
        f"him: his work, skills, projects, experience, education, certifications, city, contact details and how "
        f"to hire him. Be warm, concise and professional.",
        "",
        "=== WHO HE IS ===",
        f"Name: {P.NAME} (also known as {', '.join(P.ALSO_KNOWN_AS)})",
        f"Role: {P.ROLE}",
        f"Based in: {P.CITY}",
        f"Company: {P.COMPANY}",
        "",
        "=== CONTACT & SOCIAL LINKS (all of his official channels) ===",
        *_contact_lines(),
        "",
        "=== SERVICES ===",
        *[f"- {s}" for s in P.SERVICES],
        "",
        "=== TECH STACK ===",
        *[f"- {group}: {items}" for group, items in P.TECH.items()],
        "",
        "=== HOW HE WORKS ===",
        *[f"- {step}" for step in P.PROCESS],
        "",
        "=== FAQ ===",
        *[f"- {q}: {a}" for q, a in P.FAQ],
        "",
        "=== PROJECTS ===",
    ]
    for p in projects:
        line = f"- {p.title} ({p.category}): {p.description} Tech: {', '.join(p.tags or [])}."
        if p.live_url:
            line += f" Live: {p.live_url}"
        if p.github_url:
            line += f" Code: {p.github_url}"
        out.append(line)

    out += ["", "=== CERTIFICATIONS ==="]
    for c in certificates:
        line = f"- {c.title} (issued by {c.issuer}"
        line += f", {c.issued_on.year})" if c.issued_on else ")"
        if c.credly_url:
            line += f" Verify: {c.credly_url}"
        out.append(line)

    for kind, heading in (("experience", "WORK EXPERIENCE"), ("education", "EDUCATION")):
        out += ["", f"=== {heading} ==="]
        for e in (r for r in rows if r.kind == kind):
            when = f" [{e.period}]" if e.period else ""
            out.append(f"- {e.title}, {e.organization}{when}. {e.description or ''}".rstrip())

    if notes:
        out += ["", "=== EXTRA FACTS FROM HASNAIN ==="]
        out += [f"- {n.title}: {n.content}" for n in notes]

    out += ["", "=== RULES ===", P.RULES]
    return "\n".join(out)


# ── Keyword fallback (no Groq key, or the Groq call failed) ──────────────────
def _has(q: str, *words: str) -> bool:
    return any(w in q for w in words)


# Small talk. A *pure* greeting ("hello", "assalam o alaikum") is answered straight away; the rest
# (thanks, bye, "how are you") is only tried after the topic keywords, so "hello, what is his
# email?" still gets the email answer.
_HELLO = {"hi", "hii", "hiii", "hello", "helo", "hey", "heya", "hola", "yo", "howdy", "greetings", "sup"}
_GREETING_FILLER = {
    "there", "naini", "good", "morning", "afternoon", "evening", "dear", "sir", "bro", "and", "o", "wa", "u",
    "alaikum", "alaykum", "aoa", "salam", "salaam", "assalam", "assalamu", "asalam", "assalamualaikum",
    "assalamualaykum", "salams",
}
_SALAM = ("alaikum", "alaykum", "salam", "salaam", "aoa")
_INTRO = "I'm **Naini**, Hasnain's AI assistant. Ask me about his projects, skills, experience, certifications or how to hire him."


def _greeting(q: str) -> str | None:
    words = re.findall(r"[a-z']+", q)
    if not words or len(words) > 6 or not all(w in _HELLO or w in _GREETING_FILLER for w in words):
        return None
    if any(w.startswith(_SALAM) or any(k in w for k in _SALAM) for w in words):
        return f"Wa alaikum assalam! 😊 {_INTRO}"
    return f"Hello! 👋 {_INTRO}"


def _small_talk(q: str) -> str | None:
    words = re.findall(r"[a-z']+", q)
    if not words or len(words) > 8:
        return None
    text = " ".join(words)
    if _has(text, "how are you", "how r u", "kaise ho", "kese ho", "kaisay ho", "kya haal", "kia haal"):
        return f"I'm doing great, thank you for asking! 😊 {_INTRO}"
    if _has(text, "thank", "thanks", "thx", "shukriya", "shukria", "jazak"):
        return f"You're very welcome! 😊 To work with Hasnain, email {P.EMAIL} or message him on WhatsApp."
    if words[0] in ("bye", "goodbye") or _has(text, "see you", "take care", "good night", "khuda hafiz", "allah hafiz"):
        return f"Goodbye, and thanks for stopping by! 👋 You can always reach Hasnain at {P.EMAIL}."
    if _has(text, "who are you", "your name", "what are you", "tum kon", "aap kon", "who is naini"):
        return _INTRO
    return None


def local_reply(db: Session, question: str) -> str:
    q = question.lower()
    projects = _published(db, Project)

    if _URDU_SCRIPT.search(question):
        if _has(question, "سلام", "ہیلو", "ہائے"):
            return (
                "وعلیکم السلام! 😊 میں نینی ہوں، حسنین کی اے آئی اسسٹنٹ۔ آپ ان کے پروجیکٹس، مہارتوں، "
                "تجربے یا رابطے کے بارے میں پوچھ سکتے ہیں۔"
            )
        if _has(question, "شکریہ", "مہربانی"):
            return "آپ کا شکریہ! 😊 مزید کچھ جاننا ہو تو ضرور پوچھیں۔"
        return (
            f"معذرت، ابھی میں مکمل جواب نہیں دے پا رہی۔ حسنین سے براہِ راست رابطہ کریں: "
            f"{P.EMAIL} یا واٹس ایپ {P.PHONE_DISPLAY}۔"
        )

    for p in projects:
        if p.title.lower() in q or p.slug.replace("-", " ") in q:
            text = f"**{p.title}** ({p.category}): {p.description}"
            return text + (f"\n\nTry it live: {p.live_url}" if p.live_url else "")

    greeting = _greeting(q)
    if greeting:
        return greeting

    if _has(q, "social", "linkedin", "github", "instagram", "facebook", "twitter", "youtube", "link", "profile"):
        return "Hasnain's official channels: " + "; ".join(f"**{label}** {url}" for label, url in P.SOCIALS) + "."
    if _has(q, "hire", "contact", "email", "reach", "phone", "number", "whatsapp", "rabta", "price", "cost", "available"):
        return (
            f"You can reach Hasnain at **{P.EMAIL}** or on WhatsApp: {P.WHATSAPP} ({P.PHONE_DISPLAY}). "
            "He's available for new projects and usually replies within 24 hours."
        )
    if _has(q, "where", "city", "location", "based", "hyderabad", "sindh", "pakistan", "kahan"):
        return (
            f"Hasnain is based in **{P.CITY}** and works with local businesses and remote clients worldwide."
        )
    if _has(q, "r&r", "company", "rr digital", "agency"):
        return P.COMPANY
    if _has(q, "project", "built", "portfolio", "work"):
        names = ", ".join(f"**{p.title}**" for p in projects) or "a range of AI and backend projects"
        return f"Hasnain has built {names}. Scroll to the Work section to try the live ones."
    if _has(q, "tech", "stack", "skill", "tool", "language", "expertise"):
        return (
            "Hasnain works mainly in **Python**: FastAPI, RAG pipelines with FAISS, "
            "Llama 3 / Groq, LangChain and LangGraph, Whisper and edge-TTS for voice, spaCy, scikit-learn, "
            "Next.js and Docker."
        )
    if _has(q, "cert", "cisco", "credly"):
        certs = _published(db, Certificate)
        return "Hasnain's verified certifications: " + "; ".join(c.title for c in certs) + "."
    if _has(q, "education", "university", "degree", "study", "experience", "career"):
        rows = _published(db, Experience)
        return "\n".join(f"- **{e.title}**, {e.organization}" for e in rows) or "See the Experience section."
    if _has(q, "service", "offer", "do you do", "what do"):
        return "Hasnain offers: " + "; ".join(s.split(" (")[0] for s in P.SERVICES) + "."
    chat = _small_talk(q)
    if chat:
        return chat
    return (
        "I can tell you about Hasnain's **projects**, **skills**, **experience**, "
        f"**certifications**, **contact details**, or how to **hire him**. What would you like to know? "
        f"(Or email {P.EMAIL}.)"
    )
