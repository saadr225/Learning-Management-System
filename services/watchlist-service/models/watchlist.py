from datetime import datetime, timezone


def create_watchlist_entry(user_id: str, video_id: str) -> dict:
    return {
        "user_id": user_id,
        "video_id": video_id,
        "added_at": datetime.now(timezone.utc),
    }


def public_entry(entry: dict) -> dict:
    return {
        "id": str(entry["_id"]),
        "user_id": entry["user_id"],
        "video_id": entry["video_id"],
        "added_at": entry["added_at"].isoformat(),
    }