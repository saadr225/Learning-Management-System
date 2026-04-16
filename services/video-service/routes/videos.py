from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime, timezone
import jwt
import os
from models.video import create_video_document, public_video

videos_bp = Blueprint("videos", __name__)


# ── Auth middleware ───────────────────────────────────────────────────────────
# The video service verifies JWTs itself using the shared JWT_SECRET.
# It never calls the auth service — just validates the signature.

def require_auth(f):
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(
                token, os.environ["JWT_SECRET"], algorithms=["HS256"]
            )
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)

    return decorated


def require_admin(f):
    """Use after @require_auth — checks that the user's role is admin."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        if request.current_user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated


def get_db():
    return current_app.db


# ── Routes ────────────────────────────────────────────────────────────────────

@videos_bp.route("", methods=["GET"])
def list_videos():
    """
    Public endpoint — anyone can browse published videos.
    Supports: ?tag=python  ?search=flask  ?page=1  ?limit=10
    """
    db = get_db()
    query: dict = {"is_published": True}

    tag = request.args.get("tag")
    search = request.args.get("search")
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(int(request.args.get("limit", 10)), 50)
    skip = (page - 1) * limit

    if tag:
        query["tags"] = tag.lower()
    if search:
        # Simple title search — later you can add a proper text index
        query["title"] = {"$regex": search, "$options": "i"}

    videos = list(db.videos.find(query).skip(skip).limit(limit))
    total = db.videos.count_documents(query)

    return jsonify({
        "videos": [public_video(v) for v in videos],
        "total": total,
        "page": page,
        "limit": limit,
    }), 200


@videos_bp.route("/<video_id>", methods=["GET"])
def get_video(video_id: str):
    """Get a single video by ID. Published videos are public; unpublished require auth."""
    db = get_db()
    try:
        video = db.videos.find_one({"_id": ObjectId(video_id)})
    except Exception:
        return jsonify({"error": "Invalid video ID"}), 400

    if not video:
        return jsonify({"error": "Video not found"}), 404

    if not video["is_published"]:
        # Unpublished videos are only visible to admins
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Video not available"}), 403
        try:
            payload = jwt.decode(
                auth_header.split(" ", 1)[1],
                os.environ["JWT_SECRET"],
                algorithms=["HS256"],
            )
            if payload.get("role") != "admin":
                return jsonify({"error": "Video not available"}), 403
        except jwt.InvalidTokenError:
            return jsonify({"error": "Video not available"}), 403

    return jsonify(public_video(video)), 200


@videos_bp.route("", methods=["POST"])
@require_auth
@require_admin
def create_video():
    """Admin only — create a video metadata record."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    tags = data.get("tags", [])

    if not title:
        return jsonify({"error": "title is required"}), 400
    if not isinstance(tags, list):
        return jsonify({"error": "tags must be an array"}), 400

    db = get_db()
    doc = create_video_document(
        title=title,
        description=description,
        tags=tags,
        uploader_id=request.current_user["user_id"],
    )
    result = db.videos.insert_one(doc)
    doc["_id"] = result.inserted_id

    return jsonify({
        "message": "Video created",
        "video": public_video(doc),
    }), 201


@videos_bp.route("/<video_id>", methods=["PATCH"])
@require_auth
@require_admin
def update_video(video_id: str):
    """Admin only — update video metadata or publish/unpublish."""
    db = get_db()
    try:
        oid = ObjectId(video_id)
    except Exception:
        return jsonify({"error": "Invalid video ID"}), 400

    if not db.videos.find_one({"_id": oid}):
        return jsonify({"error": "Video not found"}), 404

    data = request.get_json(silent=True) or {}

    # Only allow updating these fields
    allowed = {"title", "description", "tags", "is_published", "duration_seconds"}
    updates = {k: v for k, v in data.items() if k in allowed}

    if "tags" in updates:
        updates["tags"] = [t.strip().lower() for t in updates["tags"]]
    if "title" in updates:
        updates["title"] = updates["title"].strip()

    updates["updated_at"] = datetime.now(timezone.utc)

    db.videos.update_one({"_id": oid}, {"$set": updates})
    updated = db.videos.find_one({"_id": oid})

    return jsonify({
        "message": "Video updated",
        "video": public_video(updated),
    }), 200


@videos_bp.route("/<video_id>", methods=["DELETE"])
@require_auth
@require_admin
def delete_video(video_id: str):
    db = get_db()
    try:
        oid = ObjectId(video_id)
    except Exception:
        return jsonify({"error": "Invalid video ID"}), 400

    video = db.videos.find_one({"_id": oid})
    if not video:
        return jsonify({"error": "Video not found"}), 404

    # Clean up S3 files before deleting the record
    if video.get("s3_key"):
        delete_s3_object(video["s3_key"])
    if video.get("thumbnail_s3_key"):
        delete_s3_object(video["thumbnail_s3_key"])

    db.videos.delete_one({"_id": oid})
    return jsonify({"message": "Video deleted"}), 200

# ── S3 Routes — add these below the existing DELETE route ────────────────────

from s3 import (
    generate_upload_url,
    generate_stream_url,
    generate_thumbnail_upload_url,
    delete_s3_object,
)


@videos_bp.route("/<video_id>/upload-url", methods=["POST"])
@require_auth
@require_admin
def get_upload_url(video_id: str):
    """
    Admin only — returns a presigned S3 PUT URL.
    The browser uses this URL to upload the video file directly to S3.
    Flask never receives the video bytes.
    """
    db = get_db()
    try:
        oid = ObjectId(video_id)
    except Exception:
        return jsonify({"error": "Invalid video ID"}), 400

    if not db.videos.find_one({"_id": oid}):
        return jsonify({"error": "Video not found"}), 404

    data = request.get_json(silent=True) or {}
    content_type = data.get("content_type", "video/mp4")

    # Validate content type
    allowed_types = {"video/mp4", "video/webm", "video/quicktime"}
    if content_type not in allowed_types:
        return jsonify({"error": f"content_type must be one of: {allowed_types}"}), 400

    result = generate_upload_url(video_id, content_type)

    # Save the s3_key to the video document now (even before upload completes)
    db.videos.update_one(
        {"_id": oid},
        {"$set": {"s3_key": result["s3_key"], "updated_at": datetime.now(timezone.utc)}},
    )

    return jsonify({
        "upload_url": result["upload_url"],
        "s3_key": result["s3_key"],
        "expires_in_seconds": 900,
        "instructions": "PUT your video file to upload_url with the matching Content-Type header",
    }), 200


@videos_bp.route("/<video_id>/thumbnail-upload-url", methods=["POST"])
@require_auth
@require_admin
def get_thumbnail_upload_url(video_id: str):
    """Admin only — returns a presigned S3 PUT URL for the thumbnail image."""
    db = get_db()
    try:
        oid = ObjectId(video_id)
    except Exception:
        return jsonify({"error": "Invalid video ID"}), 400

    if not db.videos.find_one({"_id": oid}):
        return jsonify({"error": "Video not found"}), 404

    result = generate_thumbnail_upload_url(video_id)

    db.videos.update_one(
        {"_id": oid},
        {"$set": {"thumbnail_s3_key": result["s3_key"], "updated_at": datetime.now(timezone.utc)}},
    )

    return jsonify({
        "upload_url": result["upload_url"],
        "s3_key": result["s3_key"],
        "expires_in_seconds": 900,
    }), 200


@videos_bp.route("/<video_id>/stream-url", methods=["GET"])
@require_auth
def get_stream_url(video_id: str):
    """
    Any logged-in user can get a stream URL for a published video.
    Returns a presigned S3 GET URL valid for 1 hour.
    """
    db = get_db()
    try:
        oid = ObjectId(video_id)
    except Exception:
        return jsonify({"error": "Invalid video ID"}), 400

    video = db.videos.find_one({"_id": oid})
    if not video:
        return jsonify({"error": "Video not found"}), 404

    # Non-admins can only stream published videos
    if not video["is_published"] and request.current_user.get("role") != "admin":
        return jsonify({"error": "Video not available"}), 403

    if not video.get("s3_key"):
        return jsonify({"error": "Video file has not been uploaded yet"}), 404

    stream_url = generate_stream_url(video["s3_key"])

    return jsonify({
        "stream_url": stream_url,
        "expires_in_seconds": 3600,
    }), 200