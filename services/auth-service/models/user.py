from datetime import datetime, timezone


def create_user_document(email: str, password_hash: str, role: str = "user") -> dict:
    return {
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "role": role,  # "user" or "admin"
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def public_user(user: dict) -> dict:
    """Return only the fields safe to expose in API responses."""
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"].isoformat(),
    }