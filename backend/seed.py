"""Load the starter content from data/seed.json into empty tables.

    python -m backend.seed            # only fills tables that are empty
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy import func, select

from .database import SessionLocal
from .models import Certificate, Experience, Project

SEED_FILE = Path(__file__).resolve().parent.parent / "data" / "seed.json"


def run() -> None:
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    with SessionLocal() as db:
        for key, model in (
            ("projects", Project),
            ("certificates", Certificate),
            ("experience", Experience),
        ):
            if db.scalar(select(func.count()).select_from(model)):
                print(f"{key}: already has rows, skipping")
                continue
            for order, row in enumerate(data[key]):
                row = dict(row)
                if row.get("issued_on"):
                    row["issued_on"] = date.fromisoformat(row["issued_on"])
                db.add(model(sort_order=order, **row))
            print(f"{key}: inserted {len(data[key])}")
        db.commit()


if __name__ == "__main__":
    run()
