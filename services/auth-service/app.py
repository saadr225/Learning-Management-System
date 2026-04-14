import os
from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)  # Allow React frontend to call this service

    # Connect to MongoDB and attach db to the app object
    # so routes can access it via current_app.db
    mongo_client = MongoClient(os.environ["MONGO_URI"])
    app.db = mongo_client.get_database()  # uses the DB name in the URI

    # Register the auth blueprint — all routes will be prefixed /auth
    from routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/auth")

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "auth-service"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") == "development")