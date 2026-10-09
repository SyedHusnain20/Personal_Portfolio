"""Create (or reset the password of) the admin account.

    python -m backend.create_admin you@example.com
"""

from __future__ import annotations

import getpass
import sys

from sqlalchemy import select

from .database import SessionLocal
from .models import User
from .security import hash_password


def run(email: str, password: str) -> None:
    email = email.strip().lower()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user:
            user.password_hash = hash_password(password)
            print(f"Updated password for {email}")
        else:
            db.add(User(email=email, password_hash=hash_password(password)))
            print(f"Created admin {email}")
        db.commit()


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python -m backend.create_admin <email>")
    password = getpass.getpass("Password (min 12 chars): ")
    if len(password) < 12:
        sys.exit("Password must be at least 12 characters.")
    if password != getpass.getpass("Repeat password: "):
        sys.exit("Passwords do not match.")
    run(sys.argv[1], password)


if __name__ == "__main__":
    main()
