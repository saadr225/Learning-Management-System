import os
from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient, TEXT
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app)

    mongo_client = MongoClient(os.environ["MONGO_URI"])
    app.db = mongo_client.get_database()

    # Create a text index on title so search queries are fast
    app.db.videos.create_index([("title", TEXT), ("description", TEXT)])

    from routes.videos import videos_bp
    app.register_blueprint(videos_bp, url_prefix="/videos")

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "video-service"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") == "development")