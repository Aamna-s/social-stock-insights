from sqlalchemy.util import symbol

from app.models.models import Posts, db
from flask_sqlalchemy import SQLAlchemy
class PostService:
    @staticmethod
    def create_post(user_id, content, sentiment, symbol):
        # Business logic
        db = SQLAlchemy()
        # Database operations
        post = Posts(user_id=user_id, content=content, sentiment=sentiment, symbol_id = symbol)
        db.session.add(post)
        db.session.commit()

        return post