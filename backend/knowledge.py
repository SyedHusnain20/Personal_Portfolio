"""What Naini knows: fixed facts from profile.py plus live rows from the database."""

from __future__ import annotations

import logging
import re

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import profile as P
from .models import Certificate, Experience, KnowledgeNote, Project
from .retrieval import KIND_LABEL, Chunk, Retrieval, build_chunks, retrieve

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


@dataclass
class Knowledge:
    """Everything Naini knows, loaded once per request from the database plus profile.py."""

    projects: list = field(default_factory=list)
    certificates: list = field(default_factory=list)
    rows: list = field(default_factory=list)  # experience + education
    notes: list = field(default_factory=list)
    _chunks: list[Chunk] | None = field(default=None, repr=False)

    @classmethod
    def load(cls, db: Session) -> "Knowledge":
        return cls(
            projects=list(_published(db, Project)),
            certificates=list(_published(db, Certificate)),
            rows=list(_published(db, Experience)),
            notes=_notes(db),
        )

    @property
    def chunks(self) -> list[Chunk]:
        if self._chunks is None:
            self._chunks = build_chunks(self.projects, self.certificates, self.rows, self.notes)
        return self._chunks

    def retrieve(self, question: str, prior: str | None = None) -> Retrieval:
        return retrieve(self.chunks, question, prior)

    # ── prompt for the model ────────────────────────────────────────────────
    def system_prompt(self, focus: Retrieval | None = None) -> str:
        out: list[str] = [
            f"You are Naini, the AI assistant on {P.NAME}'s portfolio website. You answer visitors' questions about "
            f"him: his work, skills, projects, experience, education, certifications, city, contact details and how "
            f"to hire him. Be warm, concise and professional.",
            "",
        ]
        if focus and focus.confident and focus.chunks:
            out += [
                "=== MOST RELEVANT FACTS FOR THE VISITOR'S QUESTION (answer from these first; all facts are also below) ===",
                *[f"- [{KIND_LABEL.get(c.kind, c.kind)}] {c.body}".replace("\n", " | ") for c in focus.chunks],
            ]
            if focus.listing and len(focus.kinds) == 1:
                kind = next(iter(focus.kinds))
                out.append(
                    f"The visitor asked specifically about his {kind}: answer with the {kind} entries only, "
                    f"and do not mix in other categories."
                )
            out.append("")
        out += [
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
        for p in self.projects:
            line = f"- {p.title} ({p.category}): {p.description} Tech: {', '.join(p.tags or [])}."
            if p.live_url:
                line += f" Live: {p.live_url}"
            if p.github_url:
                line += f" Code: {p.github_url}"
            out.append(line)

        out += ["", "=== CERTIFICATIONS ==="]
        for c in self.certificates:
            line = f"- {c.title} (issued by {c.issuer}"
            line += f", {c.issued_on.year})" if c.issued_on else ")"
            if c.credly_url:
                line += f" Verify: {c.credly_url}"
            out.append(line)

        for kind, heading in (("experience", "WORK EXPERIENCE"), ("education", "EDUCATION")):
            out += ["", f"=== {heading} ==="]
            for e in (r for r in self.rows if r.kind == kind):
                when = f" [{e.period}]" if e.period else ""
                out.append(f"- {e.title}, {e.organization}{when}. {e.description or ''}".rstrip())

        if self.notes:
            out += ["", "=== EXTRA FACTS FROM HASNAIN ==="]
            out += [f"- {n.title}: {n.content}" for n in self.notes]

        out += ["", "=== RULES ===", P.RULES]
        return "\n".join(out)

    # ── answer without a model ──────────────────────────────────────────────
    def local_answer(self, question: str, prior: str | None = None) -> tuple[str, list[str]]:
        """(reply, sources). Used when there is no Groq key or the call failed."""
        if _URDU_SCRIPT.search(question):
            return _urdu_reply(question, self)
        q = question.lower()
        greeting = _greeting(q)
        if greeting:
            return greeting, []
        r = self.retrieve(question, prior)
        if r.confident and r.chunks:
            return compose(r), r.sources
        chat = _small_talk(q)
        if chat:
            return chat, []
        return (
            "I can tell you about Hasnain's **projects**, **skills**, **experience**, **education**, "
            f"**certifications**, **contact details**, or how to **hire him**. What would you like to know? "
            f"(Or email {P.EMAIL}.)",
            [],
        )


def build_system_prompt(db: Session, focus: Retrieval | None = None) -> str:
    return Knowledge.load(db).system_prompt(focus)


def local_reply(db: Session, question: str) -> str:
    return Knowledge.load(db).local_answer(question)[0]


_INTROS = {
    "education": "Here's Hasnain's education:",
    "experience": "Here's Hasnain's work experience:",
    "certificate": "Hasnain's certifications:",
    "project": "Here are Hasnain's projects:",
    "service": "",
    "social": "Hasnain's official links:",
    "contact": "How to reach Hasnain:",
    "tech": "Hasnain's tech stack:",
}


def compose(r: Retrieval) -> str:
    """Turn retrieved facts into a readable answer."""
    chunks = r.chunks
    if len(chunks) == 1:
        return chunks[0].body
    use_short = len(chunks) > 2
    kinds = list(dict.fromkeys(c.kind for c in chunks))

    def bullet(c: Chunk) -> str:
        text = c.short if (use_short and c.short) else c.body
        return text if text.startswith("- ") else f"- {text}"

    if len(kinds) == 1:
        intro = _INTROS.get(kinds[0], "")
        if kinds[0] in ("service", "social", "contact") and len(chunks) == 1:
            return chunks[0].body
        return (intro + "\n" if intro else "") + "\n".join(bullet(c) for c in chunks)
    parts = []
    for kind in kinds:
        group = [c for c in chunks if c.kind == kind]
        parts.append(f"**{KIND_LABEL.get(kind, kind.title())}**\n" + "\n".join(bullet(c) for c in group))
    return "\n\n".join(parts)


def _urdu_reply(question: str, kb: "Knowledge") -> tuple[str, list[str]]:
    if _has(question, "سلام", "ہیلو", "ہائے"):
        return (
            "وعلیکم السلام! 😊 میں نینی ہوں، حسنین کی اے آئی اسسٹنٹ۔ آپ ان کے پروجیکٹس، مہارتوں، "
            "تعلیم، تجربے یا رابطے کے بارے میں پوچھ سکتے ہیں۔",
            [],
        )
    if _has(question, "شکریہ", "مہربانی"):
        return "آپ کا شکریہ! 😊 مزید کچھ جاننا ہو تو ضرور پوچھیں۔", []
    r = kb.retrieve(question)
    if r.confident and r.chunks:
        return (
            "معذرت، اس وقت میں اردو میں مکمل جواب نہیں دے سکتی۔ انگریزی میں جواب:\n\n" + compose(r),
            r.sources,
        )
    return (
        f"معذرت، ابھی میں مکمل جواب نہیں دے پا رہی۔ حسنین سے براہِ راست رابطہ کریں: "
        f"{P.EMAIL} یا واٹس ایپ {P.PHONE_DISPLAY}۔",
        [],
    )


# ── Small talk ──────────────────────────────────────────────────────────────
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


