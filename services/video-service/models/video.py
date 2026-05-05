from datetime import datetime, timezone


def create_video_document(
    title: str,
    description: str,
    tags: list[str],
    uploader_id: str,
    duration_seconds: int = 0,
    s3_key: str = "",
    thumbnail_s3_key: str = "",
) -> dict:
    return {
        "title": title.strip(),
        "description": description.strip(),
        "tags": [t.strip().lower() for t in tags],
        "uploader_id": uploader_id,
        "duration_seconds": duration_seconds,
        "s3_key": s3_key,                        # filled later when S3 upload is done
        "thumbnail_s3_key": thumbnail_s3_key,    # filled later
        "is_published": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def public_video(video: dict) -> dict:
    """Strip internal fields before sending to the client."""
    return {
        "id": str(video["_id"]),
        "title": video["title"],
        "description": video["description"],
        "tags": video["tags"],
        "uploader_id": video["uploader_id"],
        "duration_seconds": video["duration_seconds"],
        "is_published": video["is_published"],
        "created_at": video["created_at"].isoformat(),
        "updated_at": video["updated_at"].isoformat(),
    }