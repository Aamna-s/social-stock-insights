from sqlalchemy.util import symbol

from app.models.models import Posts, Sentiment, Symbol
from app import db
from datetime import datetime
class PostService:
    @staticmethod
    def create_post(data):
        # Database operations
        sentiment_id = Sentiment.query.filter_by(name = data['sentiment']).first_or_404()
        symbol_id = Symbol.query.filter_by(code = data['symbol']).first_or_404()
        post = Posts(user_id=data['userId'],
                content=data['content'],
                sentiment_id=sentiment_id.to_dict()['id'],
                symbol_id=symbol_id.to_dict()['id'],
                image_attachment=data['imageAttachment'],
                created_at = datetime.now())

        db.session.add(post)
        db.session.commit()

        return post