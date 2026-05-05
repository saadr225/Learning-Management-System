from flask import Blueprint, request, jsonify
from pymongo.database import Database
import bcrypt
import jwt
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId

auth_bp = Blueprint("auth", __name__)


# ── helpers ──────────────────────────────────────────────────────────────────

def get_db() -> Database:
    """Pull the db object that was attached to the app in app.py."""
    from flask import current_app
    return current_app.db


def make_access_token(user: dict) -> str:
    """Short-lived token (15 min) carried in Authorization header."""
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS256")


def make_refresh_token(user: dict) -> str:
    """Long-lived token (7 days) used only to issue new access tokens."""
    payload = {
        "user_id": str(user["_id"]),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, os.environ["JWT_REFRESH_SECRET"], algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])


def require_auth(f):
    """Decorator: protects routes that need a valid JWT."""
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_access_token(token)
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)

    return decorated


# ── routes ───────────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")
    role = data.get("role", "user")

    # Basic validation
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if role not in ("user", "admin"):
        return jsonify({"error": "Role must be 'user' or 'admin'"}), 400

    db = get_db()

    # Prevent duplicate accounts
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    # Hash the password — bcrypt handles salt automatically
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    user_doc = {
        "email": email,
        "password_hash": password_hash,
        "role": role,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    return jsonify({
        "message": "User registered successfully",
        "access_token": make_access_token(user_doc),
        "refresh_token": make_refresh_token(user_doc),
        "user": {
            "id": str(user_doc["_id"]),
            "email": user_doc["email"],
            "role": user_doc["role"],
        },
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db = get_db()
    user = db.users.find_one({"email": email})

    # Use a constant-time check to prevent timing attacks
    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "access_token": make_access_token(user),
        "refresh_token": make_refresh_token(user),
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
        },
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    refresh_token = data.get("refresh_token", "")
    if not refresh_token:
        return jsonify({"error": "refresh_token is required"}), 400

    try:
        payload = jwt.decode(
            refresh_token,
            os.environ["JWT_REFRESH_SECRET"],
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired, please log in again"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 401

    db = get_db()
    user = db.users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "access_token": make_access_token(user),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    """Returns the profile of the currently authenticated user."""
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(request.current_user["user_id"])})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"].isoformat(),
    }), 200