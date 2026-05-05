import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.auth_db = MongoClient(os.environ["AUTH_MONGO_URI"]).get_database()
    app.video_db = MongoClient(os.environ["VIDEO_MONGO_URI"]).get_database()

    from routes.admin import admin_bp

    app.register_blueprint(admin_bp, url_prefix="/admin")

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "admin-service"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5004))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") == "development")