import os
from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app)

    mongo_client = MongoClient(os.environ["MONGO_URI"])
    app.db = mongo_client.get_database()

    # Index for fast per-user lookups
    app.db.watchlist.create_index([("user_id", 1), ("video_id", 1)], unique=True)

    from routes.watchlist import watchlist_bp
    app.register_blueprint(watchlist_bp, url_prefix="/watchlist")

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "watchlist-service"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5003))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") == "development")