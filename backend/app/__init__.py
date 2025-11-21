# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Initialize DB here (outside create_app to avoid circular imports)
db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    # Initialize db with app
    db.init_app(app)

    from app.models.models import User
    from app.models.models import Posts

    from app.routes import init_routes
    init_routes(app)  # Register all routes

    with app.app_context():
        db.create_all()

    return app