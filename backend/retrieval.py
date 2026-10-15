"""Retrieval over everything Naini knows: BM25 ranking plus intent detection.

Why not FAISS + sentence-transformers like QanoonDaan? The knowledge base here is a few dozen short
facts (projects, certificates, education, contacts...). Keyword ranking with intent detection is
accurate at that size, deterministic, has no model to download, and fits a Vercel serverless function
(no 250 MB bundle, no cold-start penalty). The same chunks are used two ways:

* with a model (Groq): the best-matching facts are placed first in the prompt as focus, and shown
  under the answer as its sources;
* without one (no key, or the call failed): the answer is composed straight from those facts.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from . import profile as P

KIND_LABEL = {
    "about": "About",
    "contact": "Contact",
    "social": "Links",
    "service": "Services",
    "tech": "Tech stack",
    "process": "How he works",
    "faq": "FAQ",
    "project": "Project",
    "certificate": "Certification",
    "experience": "Experience",
    "education": "Education",
    "note": "Note",
}

# Kinds a visitor can ask to *list* ("his education", "his projects"): all matching facts are returned.
LIST_KINDS = {"education", "experience", "project", "certificate", "service", "social", "contact", "tech"}


@dataclass(frozen=True)
class Chunk:
    kind: str
    title: str
    body: str  # markdown-lite; what is shown and what the model reads
    short: str = ""  # one-liner used when many chunks are listed together
    keywords: str = ""  # extra index terms, never shown
    aliases: tuple[str, ...] = ()  # exact names: if one appears in the question, this chunk is the answer
    order: int = 0

    @property
    def label(self) -> str:
        return f"{KIND_LABEL.get(self.kind, self.kind.title())} · {self.title}"


@dataclass
class Retrieval:
    chunks: list[Chunk] = field(default_factory=list)
    kinds: set[str] = field(default_factory=set)  # kinds the visitor asked about
    listing: bool = False  # True when the whole category was asked for
    confident: bool = False  # False: nothing in the knowledge base really matches

    @property
    def sources(self) -> list[str]:
        return [c.label for c in self.chunks[:3]] if self.confident else []


# ── text processing ─────────────────────────────────────────────────────────
_WORD = re.compile(r"[\w+#]+", re.UNICODE)

_STOP = set(
    """a an the is are was were be been am do does did have has had i you he him his her she it its we they them
    my your our their me of in on at to for from with by about as and or but not no so than that this these those
    what which who whom whose when why how can could would should will shall may might tell give show please also
    any some there here if then just very more most much many into over out up down off again only own same too
    now know like want need get got let lets s t don dont doesnt isnt hes shes whats thats naini hasnain
    hai hain hy kya kia ki ka ke ko se mein main me aap ap tum aur ya bhi ye yeh wo woh us kar karo karna karen
    karein batao batain bataye bataen bata do de dein kaise""".split()
)


def _stem(w: str) -> str:
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
        return w[:-1]
    return w


def _words(text: str) -> list[str]:
    return _WORD.findall(text.lower().replace("r&r", "rr").replace("&", " and "))


def tokens(text: str) -> list[str]:
    return [_stem(w) for w in _words(text) if w not in _STOP]


def _norm(text: str) -> str:
    return " " + " ".join(_words(text)) + " "


# ── intent: which category is the visitor asking about? ─────────────────────
_KIND_WORDS = {
    "education": "education educational degree university college study studied studies graduate graduated "
    "graduation qualification qualifications school bachelor bs academic alumni taleem talim parhai "
    "تعلیم ڈگری یونیورسٹی",
    "experience": "experience experiences job jobs career worked employment employer employed role roles "
    "position positions history tajurba tajraba تجربہ",
    "project": "project projects built portfolio app apps product products shipped kaam پروجیکٹ پروجیکٹس منصوبے",
    "certificate": "certificate certificates certification certifications certified credential credentials "
    "credly badge badges سرٹیفکیٹ",
    "contact": "contact email mail gmail phone number mobile whatsapp call reach message rabta raabta "
    "رابطہ ایمیل فون واٹس",
    "social": "social socials profile profiles link links platform platforms handle handles",
    "service": "service services offer offers offering provide provides khidmat khidmaat خدمات",
    "tech": "tech technology technologies stack tools tool skill skills framework "
    "frameworks expertise specialize specialise specialization proficient",
    "about": "location city based located shehar country timezone introduce yourself شہر",
}
_KIND_LOOKUP: dict[str, str] = {}
for _kind, _words_ in _KIND_WORDS.items():
    for _w in _words_.split():
        _KIND_LOOKUP[_stem(_w)] = _kind

_NEGATORS = {"not", "no", "nahi", "nahin", "nhi", "instead", "except", "without", "dont", "never"}


def detect_kinds(question: str) -> tuple[set[str], set[str]]:
    """(wanted kinds, excluded kinds). 'education, not experience' wants education and excludes experience."""
    words = [_stem(w) for w in _words(question)]
    wanted: set[str] = set()
    excluded: set[str] = set()
    for i, w in enumerate(words):
        kind = _KIND_LOOKUP.get(w)
        if not kind:
            continue
        before = {x for x in _words(question)[max(0, i - 3) : i]}
        (excluded if before & _NEGATORS else wanted).add(kind)
    return wanted - excluded, excluded


# ── the knowledge base as chunks ────────────────────────────────────────────
def _lead(text: str, sentences: int = 2, limit: int = 330) -> str:
    """The first couple of sentences (that is where the headline numbers live)."""
    parts = re.findall(r".+?(?:[.!?](?=\s|$)|$)", text.strip())
    out = " ".join(p.strip() for p in parts[:sentences] if p.strip())
    return out if len(out) <= limit else out[:limit].rsplit(" ", 1)[0] + "…"


_FAQ_KEYWORDS = {
    "Pricing": "price pricing cost rate rates charge fee fees budget quote estimate expensive cheap payment pay",
    "Availability and response time": "available availability free hire hiring respond response reply time busy open",
    "Where he works from": "where location city country remote timezone based work from",
    "How to start a project": "start begin project brief hire hiring process how get started engage",
    "Who owns the code": "own owner ownership code license intellectual property handover",
    "Live demos": "demo demos live try test link hugging face spaces",
}


def build_chunks(projects, certificates, rows, notes) -> list[Chunk]:
    """projects / certificates / rows / notes are the published ORM rows."""
    chunks: list[Chunk] = []

    def add(**kw):
        chunks.append(Chunk(order=len(chunks), **kw))

    add(
        kind="about",
        title=P.NAME,
        body=f"**{P.NAME}** is an {P.ROLE} based in {P.CITY}. {P.COMPANY}",
        keywords="who about introduce city location based live lives where from hyderabad sindh pakistan "
        "timezone company rr digital solutions cofounder founder name aka also known",
        aliases=("rr digital solutions", "rr digital"),
    )
    add(
        kind="contact",
        title="Email & phone",
        body=f"Email: **{P.EMAIL}**\nPhone / WhatsApp: **{P.PHONE_DISPLAY}** ({P.WHATSAPP})",
        keywords="contact email mail phone number mobile whatsapp call reach message hire hiring rabta",
    )
    add(
        kind="social",
        title="Social & web links",
        body="\n".join(f"- **{label}**: {url}" for label, url in P.SOCIALS),
        keywords="social media linkedin github website portfolio profile profiles links platform handle instagram "
        "facebook twitter youtube",
    )
    add(
        kind="service",
        title="What he offers",
        body="Services Hasnain offers:\n" + "\n".join(f"- {s}" for s in P.SERVICES),
        keywords="service services offer offering provide hire chatbot automation freelance",
    )
    for group, items in P.TECH.items():
        add(
            kind="tech",
            title=group,
            body=f"**{group}:** {items}",
            keywords="tech technology stack tools skills language framework expertise",
        )
    add(kind="process", title="How he works", body="\n".join(f"- {s}" for s in P.PROCESS), keywords="process workflow scope build ship steps")
    for question, answer in P.FAQ:
        add(kind="faq", title=question, body=answer, keywords=_FAQ_KEYWORDS.get(question, ""))

    for p in projects:
        body = f"**{p.title}** ({p.category}): {p.description}"
        if p.live_url:
            body += f"\nLive: {p.live_url}"
        if p.github_url:
            body += f"\nCode: {p.github_url}"
        add(
            kind="project",
            title=p.title,
            body=body,
            short=f"**{p.title}** ({p.category}): {_lead(p.description)}",
            keywords=" ".join(p.tags or []) + " project built app product",
            aliases=tuple({_norm(p.title).strip(), _norm(p.slug.replace("-", " ")).strip()}),
        )
    for c in certificates:
        year = f", {c.issued_on.year}" if c.issued_on else ""
        body = f"**{c.title}**, issued by {c.issuer}{year}"
        if c.credly_url:
            body += f"\nVerify: {c.credly_url}"
        add(
            kind="certificate",
            title=c.title,
            body=body,
            short=f"**{c.title}**, {c.issuer}{year}",
            keywords="certificate certification certified credential badge",
            aliases=(_norm(c.title).strip(), _norm(c.issuer).strip()),
        )
    for e in rows:
        period = f" ({e.period})" if e.period else ""
        body = f"**{e.title}**, {e.organization}{period}"
        if e.description:
            body += f". {e.description}"
        org_aliases = {_norm(e.organization).strip(), _norm(e.title).strip()}
        org_aliases.update(_norm(a).strip() for a in re.findall(r"\(([^)]+)\)", e.organization))
        words = (
            "education degree university college study studied school qualification graduate"
            if e.kind == "education"
            else "experience work job career role employment employer worked history"
        )
        add(
            kind=e.kind,
            title=e.title,
            body=body,
            short=f"**{e.title}**, {e.organization}{period}",
            keywords=words,
            aliases=tuple(a for a in org_aliases if len(a) > 2),
        )
    for n in notes:
        add(kind="note", title=n.title, body=f"**{n.title}**: {n.content}", keywords=n.title)
    return chunks


# ── ranking ─────────────────────────────────────────────────────────────────
_K1, _B = 1.5, 0.75
MIN_SCORE = 1.5  # below this, nothing really matches the question


def _bm25(chunks: list[Chunk], query: list[str]) -> list[float]:
    docs = [tokens(c.title) * 2 + tokens(c.body) + tokens(c.keywords) for c in chunks]
    n = len(docs) or 1
    avg = (sum(len(d) for d in docs) / n) or 1.0
    df: dict[str, int] = {}
    for d in docs:
        for t in set(d):
            df[t] = df.get(t, 0) + 1
    scores = []
    for d in docs:
        score = 0.0
        for t in set(query):
            f = d.count(t)
            if not f:
                continue
            idf = math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
            score += idf * f * (_K1 + 1) / (f + _K1 * (1 - _B + _B * len(d) / avg))
        scores.append(score)
    return scores


def retrieve(chunks: list[Chunk], question: str, prior: str | None = None, k: int = 4) -> Retrieval:
    wanted, excluded = detect_kinds(question)
    usable = [c for c in chunks if c.kind not in excluded]
    qn = _norm(question)

    entity = [c for c in usable if any(a and f" {a} " in qn for a in c.aliases)]
    query = [t for t in tokens(question) if t not in _KIND_LOOKUP]

    # A follow-up with no signal of its own ("and that one?") borrows the previous question.
    if not wanted and not entity and not query and prior:
        return retrieve(chunks, prior, None, k)

    # Rank everything once, so rare words keep their weight even when we only look at one category.
    score_of = dict(zip((c.order for c in usable), _bm25(usable, query))) if query else {}

    # 1) The visitor named a category: return it, narrowed by any extra detail they gave.
    if wanted:
        pool = [c for c in usable if c.kind in wanted or (("about" in wanted) and c.kind == "faq")]
        if entity:
            narrowed = [c for c in pool if c in entity]
            if not narrowed:  # "live link of ShariahEase": the named thing beats the generic category
                return Retrieval(sorted(entity, key=lambda c: c.order)[:k], wanted, False, True)
            pool = narrowed
        if pool:
            if "about" in wanted and not (wanted & LIST_KINDS):
                ranked = sorted(pool, key=lambda c: (-score_of.get(c.order, 0.0), c.order))
                return Retrieval(ranked[:2], wanted, False, True)
            if query:
                best = max(score_of.get(c.order, 0.0) for c in pool)
                if best >= MIN_SCORE:
                    ranked = sorted(pool, key=lambda c: (-score_of.get(c.order, 0.0), c.order))
                    keep = [c for c in ranked if score_of.get(c.order, 0.0) >= 0.5 * best][:3]
                    if len(keep) < len(pool):  # the extra detail really singled something out
                        return Retrieval(keep, wanted, False, True)
            return Retrieval(sorted(pool, key=lambda c: c.order), wanted, True, True)

    # 2) A specific thing was named (a project, a university, "R&R"): that is the answer.
    if entity:
        return Retrieval(sorted(entity, key=lambda c: c.order)[:k], wanted, False, True)

    # 3) Free-form question: rank everything.
    best = max(score_of.values(), default=0.0)
    if best < MIN_SCORE:
        if prior:  # "and that one?": nothing in this message matches, so reuse the previous question
            return retrieve(chunks, prior, None, k)
        return Retrieval([], wanted, False, False)
    ranked = sorted(usable, key=lambda c: (-score_of.get(c.order, 0.0), c.order))
    keep = [c for c in ranked if score_of.get(c.order, 0.0) >= 0.5 * best][:k]
    return Retrieval(keep, wanted, False, True)
