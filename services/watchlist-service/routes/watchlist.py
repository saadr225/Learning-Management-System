from flask import Blueprint, request, jsonify, current_app
import jwt
import os
import requests as http
from models.watchlist import create_watchlist_entry, public_entry

watchlist_bp = Blueprint("watchlist", __name__)


# ── Auth middleware ───────────────────────────────────────────────────────────

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


def get_db():
    return current_app.db


def fetch_video_metadata(video_id: str, token: str) -> dict | None:
    """
    Calls the video service to get metadata for a single video.
    Used when building the enriched watchlist response.
    """
    try:
        video_url = os.environ["VIDEO_SERVICE_URL"]
        resp = http.get(
            f"{video_url}/videos/{video_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


# ── Routes ────────────────────────────────────────────────────────────────────

@watchlist_bp.route("", methods=["GET"])
@require_auth
def get_watchlist():
    """
    Returns the current user's watchlist, enriched with video metadata
    fetched from the video service.
    """
    db = get_db()
    user_id = request.current_user["user_id"]
    token = request.headers.get("Authorization", "").split(" ", 1)[1]

    entries = list(db.watchlist.find({"user_id": user_id}).sort("added_at", -1))

    # Enrich each entry with video metadata from the video service
    enriched = []
    for entry in entries:
        video = fetch_video_metadata(entry["video_id"], token)
        enriched.append({
            **public_entry(entry),
            "video": video,  # None if video was deleted or unavailable
        })

    return jsonify({
        "watchlist": enriched,
        "total": len(enriched),
    }), 200


@watchlist_bp.route("", methods=["POST"])
@require_auth
def add_to_watchlist():
    """Add a video to the current user's watchlist."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    video_id = data.get("video_id", "").strip()
    if not video_id:
        return jsonify({"error": "video_id is required"}), 400

    db = get_db()
    user_id = request.current_user["user_id"]

    # Prevent duplicates
    if db.watchlist.find_one({"user_id": user_id, "video_id": video_id}):
        return jsonify({"error": "Video already in watchlist"}), 409

    entry = create_watchlist_entry(user_id=user_id, video_id=video_id)
    result = db.watchlist.insert_one(entry)
    entry["_id"] = result.inserted_id

    return jsonify({
        "message": "Added to watchlist",
        "entry": public_entry(entry),
    }), 201


@watchlist_bp.route("/<video_id>", methods=["DELETE"])
@require_auth
def remove_from_watchlist(video_id: str):
    """Remove a video from the current user's watchlist."""
    db = get_db()
    user_id = request.current_user["user_id"]

    result = db.watchlist.delete_one({"user_id": user_id, "video_id": video_id})
    if result.deleted_count == 0:
        return jsonify({"error": "Video not in watchlist"}), 404

    return jsonify({"message": "Removed from watchlist"}), 200


@watchlist_bp.route("/check/<video_id>", methods=["GET"])
@require_auth
def check_watchlist(video_id: str):
    """Check if a specific video is in the current user's watchlist."""
    db = get_db()
    user_id = request.current_user["user_id"]

    entry = db.watchlist.find_one({"user_id": user_id, "video_id": video_id})
    return jsonify({"in_watchlist": entry is not None}), 200