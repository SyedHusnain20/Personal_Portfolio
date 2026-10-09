"""Vercel entrypoint: exposes the FastAPI app. vercel.json rewrites /api/* here."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402,F401
