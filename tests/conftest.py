import os
import tempfile

# Must be set before the backend is imported.
_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["JWT_SECRET"] = "test-secret-test-secret-test-secret-123"
os.environ.pop("GROQ_API_KEY", None)
os.environ["REVALIDATE_SECRET"] = ""
os.environ.pop("VERCEL", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.database import SessionLocal, engine  # noqa: E402
from backend.main import app  # noqa: E402
from backend.models import Base, User  # noqa: E402
from backend.security import hash_password  # noqa: E402

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "correct-horse-battery"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(User(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD)))
        db.commit()
    yield


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def admin(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return client


PROJECT = {
    "title": "My Project",
    "category": "Demo",
    "description": "A demo project.",
    "tags": ["Python", "FastAPI"],
    "live_url": "https://example.com",
}
