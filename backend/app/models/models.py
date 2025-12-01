from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from app import db

class Sentiment(db.Model):
    __tablename__ = 'sentiment'

    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(10))
    code = db.Column(db.String(10))
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'is_active': self.is_active
        }
class User(db.Model):
    __tablename__ = 'cust'

    id = db.Column(db.Integer(), primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password = db.Column(db.String(256))
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    profile_picture = db.Column(db.String())
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reputation_score = db.Column(db.Float, default=50.0)  # 0-100 score
    post_quality_avg = db.Column(db.Float, default=0.0)   # Average quality of posts
    post_count = db.Column(db.Integer, default=0)         # Number of posts

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'profile_picture': self.profile_picture,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Symbol(db.Model):
    __tablename__ = 'symbol'

    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(10))
    code = db.Column(db.String(10))
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'is_active': self.is_active
        }
class Posts(db.Model):
     __tablename__ = 'posts'
     id = db.Column(db.Integer(), primary_key=True)
     content=db.Column(db.Text, nullable=False)
     created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
     processed= db.Column(db.Boolean, default=False)
     sentiment_score=db.Column(db.Integer, default=0)
     user_id= db.Column(db.Integer(), db.ForeignKey('cust.id'), nullable=False, index=True)
     sentiment = db.Column(db.String(10))
     symbol_id =  db.Column(db.Integer(), db.ForeignKey('symbol.id'), nullable=False, index=True)
     image_attachment = db.Column(db.String())
     likes_count = db.Column(db.Integer, default=0)
     user = db.relationship("User", lazy="joined")
     symbol = db.relationship("Symbol", lazy="joined")
     def to_dict(self):
         return {
             'id': self.id,
             'created_at': self.created_at.isoformat() if self.created_at else None,
             'content': self.content,
             'user_id': User.query.filter_by(id=self.user_id).first().first_name ,
             'sentiment': self.sentiment,
             'symbol_id': Symbol.query.filter_by(id= self.symbol_id).first().code,
             'image_attachment': self.image_attachment,
             'sentiment_score': self.sentiment_score,
             'likes_count': self.likes_count
         }


class Comment(db.Model):
    __tablename__ = 'comment'

    id = db.Column(db.Integer(), primary_key=True)
    content = db.Column(db.String(10))
    parent_id = db.Column(db.Integer(), db.ForeignKey('comment.id'), nullable=True, index=True)
    post_id = db.Column(db.Integer(), db.ForeignKey('posts.id'), nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True)
    user_id = db.Column(db.Integer, db.ForeignKey('cust.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", lazy="joined")
    replies = db.relationship("Comment", lazy="joined")
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'parent_id': self.parent_id,
            'post_id': self.post_id,
            'user_id': self.user_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }