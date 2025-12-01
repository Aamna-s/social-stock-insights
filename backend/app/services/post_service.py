from sqlalchemy.util import symbol

from app.models.models import Posts, Sentiment, Symbol, Comment, User
from app import db
from datetime import datetime

from app.models.serializers import CommentDetailSerializer


class PostService:
    @staticmethod
    def create_post(data):
        # Database operations
        symbol_id = Symbol.query.filter_by(code = data['symbol']).first_or_404()
        post = Posts(user_id=data['userId'],
                content=data['content'],
                sentiment=data['sentiment'],
                sentiment_score=data['sentimentScore'],
                symbol_id=symbol_id.to_dict()['id'],
                image_attachment= data.get('imageAttachment', None),
                created_at = datetime.now())
        user = User.query.filter_by(id = data['userId']).first_or_404()
        user.post_count = user.post_count +1
        # user.post_quality_avg = data['postQualityAvg']
        # user.reputation_score = data['reputationScore']
        db.session.add(post)
        db.session.commit()

        return post

    @staticmethod
    def get_posts(user_id):
        posts = Posts.query.filter_by(user_id = user_id).all();
        return posts

    @staticmethod
    def get_posts_by_symbol(symbol_code):
        posts = Posts.query.join(Posts.symbol).filter(Symbol.code == symbol_code).all()
        return posts

    @staticmethod
    def get_all_posts():
        posts = Posts.query.filter_by().all();
        return posts

    @staticmethod
    def post_like(post_id):
        post = Posts.query.filter_by(id = post_id).first_or_404()

        post.likes_count = (post.likes_count or 0) + 1
        db.session.commit()

        return post

    @staticmethod
    def add_comment(data, post_id):
       comment = Comment(content= data['content'], post_id= post_id, user_id = data['userId'], parent_id= data.get('parentId', None), created_at = datetime.now())
       db.session.add(comment)
       db.session.commit()

       return comment

    @staticmethod
    def get_comments_with_replies(post_id):
        comments = Comment.query.filter_by(post_id=post_id, parent_id=None).all()

        comment_schema = CommentDetailSerializer()
        reply_schema = CommentDetailSerializer(many=True)

        data = []

        for c in comments:
            replies = Comment.query.filter_by(parent_id=c.id).all()

            data.append({
                "comment": comment_schema.dump(c),
                "replies": reply_schema.dump(replies)
            })

        return data
