import os
from functools import wraps

import jwt
import requests as http
from bson import ObjectId
from flask import Blueprint, jsonify, request, current_app

admin_bp = Blueprint("admin", __name__)


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed token"}), 401
        token = auth.split(" ", 1)[1]
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
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.current_user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)

    return decorated


def public_video_doc(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "description": doc["description"],
        "tags": doc["tags"],
        "uploader_id": doc["uploader_id"],
        "duration_seconds": doc["duration_seconds"],
        "is_published": doc["is_published"],
        "created_at": doc["created_at"].isoformat(),
        "updated_at": doc["updated_at"].isoformat(),
        "has_video_file": bool(doc.get("s3_key")),
    }


def video_auth_headers() -> dict:
    return {"Authorization": request.headers.get("Authorization", "")}


def forward_video(method: str, path: str, **kwargs):
    base = os.environ["VIDEO_SERVICE_URL"].rstrip("/")
    url = f"{base}/videos{path}"
    resp = http.request(
        method, url, headers=video_auth_headers(), timeout=30, **kwargs
    )
    return resp


@admin_bp.route("/dashboard", methods=["GET"])
@require_auth
@require_admin
def dashboard():
    auth_db = current_app.auth_db
    video_db = current_app.video_db

    user_count = auth_db.users.count_documents({})
    video_total = video_db.videos.count_documents({})
    published = video_db.videos.count_documents({"is_published": True})

    return jsonify(
        {
            "users": user_count,
            "videos_total": video_total,
            "videos_published": published,
            "videos_draft": video_total - published,
        }
    ), 200


@admin_bp.route("/users", methods=["GET"])
@require_auth
@require_admin
def list_users():
    auth_db = current_app.auth_db
    users = list(auth_db.users.find({}, {"password_hash": 0}).sort("created_at", -1))

    out = []
    for u in users:
        out.append(
            {
                "id": str(u["_id"]),
                "email": u["email"],
                "role": u["role"],
                "created_at": u["created_at"].isoformat(),
            }
        )

    return jsonify({"users": out, "total": len(out)}), 200


@admin_bp.route("/videos", methods=["GET"])
@require_auth
@require_admin
def list_all_videos():
    """All videos including drafts (reads video DB directly)."""
    video_db = current_app.video_db
    docs = list(video_db.videos.find({}).sort("updated_at", -1))
    return jsonify(
        {"videos": [public_video_doc(d) for d in docs], "total": len(docs)}
    ), 200


@admin_bp.route("/videos", methods=["POST"])
@require_auth
@require_admin
def proxy_create_video():
    resp = forward_video("POST", "", json=request.get_json(silent=True) or {})
    return (resp.text, resp.status_code, {"Content-Type": resp.headers.get("Content-Type", "application/json")})


@admin_bp.route("/videos/<video_id>/upload-url", methods=["POST"])
@require_auth
@require_admin
def proxy_upload_url(video_id: str):
    resp = forward_video(
        "POST",
        f"/{video_id}/upload-url",
        json=request.get_json(silent=True) or {},
    )
    return (resp.text, resp.status_code, {"Content-Type": resp.headers.get("Content-Type", "application/json")})


@admin_bp.route("/videos/<video_id>", methods=["PATCH", "DELETE"])
@require_auth
@require_admin
def proxy_video_mutations(video_id: str):
    if request.method == "PATCH":
        resp = forward_video("PATCH", f"/{video_id}", json=request.get_json(silent=True) or {})
    else:
        resp = forward_video("DELETE", f"/{video_id}")
    return (resp.text, resp.status_code, {"Content-Type": resp.headers.get("Content-Type", "application/json")})