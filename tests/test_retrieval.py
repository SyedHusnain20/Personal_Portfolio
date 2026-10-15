"""Naini's retriever: does each kind of question reach the right facts?

Uses realistic data (the same shape as the live site) and checks the answer the visitor would see
when no language model is available, plus the facts handed to the model as focus.
"""

import pytest

from backend.database import SessionLocal
from backend.knowledge import Knowledge, compose

PROJECTS = [
    ("ShariahEase", "Islamic Finance AI", "AI-powered Islamic finance platform with Zakat calculation, halal stock screening, Mudarabah simulation, an AI chatbot, voice interaction, PDF certificates and a WhatsApp bot. Zakat and halal-screening checks run 80% faster.", ["Python", "FastAPI", "FAISS", "Llama 3", "Whisper", "WhatsApp API"]),
    ("QanoonDaan", "Legal AI", "A RAG-based legal advisory chatbot that makes Pakistani legal guidance accessible in seconds, with cited official sources. It handles 90% of Pakistani legal queries.", ["RAG", "FAISS", "Sentence-Transformers", "Groq", "Llama 3", "FastAPI"]),
    ("FeeTrack", "Education Tech", "School fee and attendance management system with custom fee overrides, holiday handling and admin notifications. It speeds up fee collection by 70%.", ["Python", "FastAPI", "PostgreSQL", "Alembic", "Docker"]),
    ("ResuFit", "Recruiting AI", "An AI resume-screening API that ranks resumes against a job description by semantic relevance. It cuts manual screening time by 70%.", ["Python", "spaCy", "scikit-learn", "REST API", "Docker"]),
    ("Chicken Khata", "Business Software", "Offline khata and billing software for a local chicken shop with thermal-receipt printing. It cut daily ledger work by 95%.", ["Electron", "TypeScript", "SQLite", "Thermal printing"]),
]
ROWS = [
    ("experience", "Co-Founder & Lead AI / Backend Engineer", "R&R Digital Solutions", "Apr 2026 - Present", "Run a software and AI practice in Hyderabad, building custom products for local businesses."),
    ("experience", "AI & Backend Engineer", "Independent AI Consulting / Freelance", "2025 - Present", "AI systems for real clients."),
    ("experience", "Python Developer", "Local Freelance · Hyderabad, Sindh", "2023 - Present", "Python projects for local clients."),
    ("education", "BS in Software Engineering", "University of Sindh", "2020 - 2024", "Software architecture, algorithms, data systems and full-stack development."),
    ("education", "AI & Data Science Specialization", "Saylani Mass IT Training (SMIT)", "2025", "Hands-on training in machine learning, deep learning and NLP."),
]
CERTS = [("Prompt Like an Engineer", "Anthropic Academy"), ("Python Essentials 1", "Cisco Networking Academy"), ("Cybersecurity Essentials", "Cisco Networking Academy")]


@pytest.fixture()
def know(admin):
    for t, c, d, tags in PROJECTS:
        assert admin.post("/api/admin/projects", json={"title": t, "category": c, "description": d, "tags": tags, "live_url": f"https://example.com/{t}"}).status_code == 201
    for kind, title, org, period, desc in ROWS:
        assert admin.post("/api/admin/experience", json={"kind": kind, "title": title, "organization": org, "period": period, "description": desc}).status_code == 201
    for title, issuer in CERTS:
        assert admin.post("/api/admin/certificates", json={"title": title, "issuer": issuer}).status_code == 201
    admin.post("/api/admin/knowledge", json={"title": "Instagram", "content": "https://instagram.com/example_handle"})
    with SessionLocal() as db:
        return Knowledge.load(db)


def titles(know, question, prior=None):
    return [c.title for c in know.retrieve(question, prior).chunks]


def answer(know, question, prior=None):
    return know.local_answer(question, prior)[0]


# The two questions that failed on the old keyword matcher.
def test_education_means_education_only(know):
    for q in ("tell me about his education", "I'm asking about education, not experience", "where did he study?", "what is his degree"):
        got = titles(know, q)
        assert got == ["BS in Software Engineering", "AI & Data Science Specialization"], (q, got)
        text = answer(know, q)
        assert "University of Sindh" in text and "R&R" not in text and "Python Developer" not in text, q


def test_experience_means_experience_only(know):
    for q in ("what experience does he have?", "his work history", "tell me about his experience, not education"):
        got = titles(know, q)
        assert got == ["Co-Founder & Lead AI / Backend Engineer", "AI & Backend Engineer", "Python Developer"], (q, got)
    assert "BS in Software" not in answer(know, "his career")


def test_both_categories_when_both_are_asked(know):
    text = answer(know, "tell me about his education and experience")
    assert "BS in Software Engineering" in text and "Python Developer" in text


@pytest.mark.parametrize(
    "question, expected_first",
    [
        ("tell me about shariahease", "ShariahEase"),
        ("what is qanoondaan?", "QanoonDaan"),
        ("which project uses whisper", "ShariahEase"),
        ("which project is about legal queries", "QanoonDaan"),
        ("has he built anything with electron?", "Chicken Khata"),
        ("any project with docker", None),  # FeeTrack and ResuFit both qualify
        ("tell me about SMIT", "AI & Data Science Specialization"),
        ("what does he do at R&R Digital Solutions", None),
        ("is he certified by cisco?", None),
    ],
)
def test_specific_questions(know, question, expected_first):
    got = titles(know, question)
    assert got, question
    if expected_first:
        assert got[0] == expected_first, (question, got)


def test_docker_projects_and_cisco_certs_and_rr(know):
    assert set(titles(know, "any project with docker")) >= {"FeeTrack", "ResuFit"}
    assert set(titles(know, "is he certified by cisco?")) == {"Python Essentials 1", "Cybersecurity Essentials"}
    got = titles(know, "what does he do at R&R Digital Solutions")
    assert "Co-Founder & Lead AI / Backend Engineer" in got


@pytest.mark.parametrize(
    "question, must_contain",
    [
        ("how can I contact him?", "hasnainzainulabdin@gmail.com"),
        ("what is his phone number", "+92 312 6641281"),
        ("his linkedin", "linkedin.com/in/hasnain-zainulabdin"),
        ("share his social media links", "github.com/SyedHusnain20"),
        ("does he have instagram?", "instagram.com/example_handle"),
        ("where is he based?", "Hyderabad"),
        ("what are his certifications", "Cisco Networking Academy"),
        ("what services does he offer", "Custom chatbots"),
        ("what is his tech stack", "FastAPI"),
        ("does he know langchain", "LangChain"),
        ("what is the pricing", "estimate"),
        ("who owns the code", "client"),
        ("how do I hire him", "Project inquiry"),
        # Roman Urdu
        ("us ki taleem kya hai", "University of Sindh"),
        ("tajurba batao", "R&R Digital Solutions"),
        ("rabta kaise karen", "hasnainzainulabdin@gmail.com"),
        ("Hasnain ki services kya hain?", "Custom chatbots"),
    ],
)
def test_answers_contain_the_right_fact(know, question, must_contain):
    assert must_contain in answer(know, question), (question, answer(know, question))


def test_follow_up_uses_the_previous_question(know):
    assert "University of Sindh" in answer(know, "and that one?", prior="tell me about his education")


def test_nonsense_and_off_topic_are_not_confident(know):
    for q in ("what's the weather today", "asdkjh qwe", "who won the cricket match"):
        r = know.retrieve(q)
        assert not r.confident and r.sources == [], q


def test_sources_are_labelled_and_limited(know):
    r = know.retrieve("tell me about his education")
    assert r.sources == ["Education · BS in Software Engineering", "Education · AI & Data Science Specialization"]
    assert len(know.retrieve("projects").sources) <= 3


def test_model_prompt_puts_the_focus_first_and_pins_the_category(know):
    prompt = know.system_prompt(know.retrieve("I'm asking about education, not experience"))
    focus = prompt.split("=== WHO HE IS ===")[0]
    assert "MOST RELEVANT FACTS" in focus and "BS in Software Engineering" in focus
    assert "Python Developer" not in focus and "answer with the education entries only" in focus
    assert "Python Developer" in prompt  # the full knowledge base is still there for other questions


def test_compose_lists_long_collections_compactly(know):
    text = answer(know, "list his projects")
    assert text.startswith("Here are Hasnain's projects:") and text.count("\n- ") >= 4
    assert "Zakat and halal-screening checks run 80% faster" in text  # first sentence kept
