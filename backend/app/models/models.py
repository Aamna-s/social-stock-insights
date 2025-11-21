from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
db = SQLAlchemy()
class Posts(db.Model):
     __tablename__ = 'posts'
     id = db.Column(db.Integer(), primary_key=True)
     content=db.Column(db.Text, nullable=False)
     sentiment= db.Column(db.Text, nullable=False)
     created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
     processed= db.Column(db.Boolean, default=False)
     quality_score=db.Column(db.Integer, default=0)
     user_id= db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False, index=True)
     symbol_id= db.Column(db.String(36), db.ForeignKey('symbol.id'), nullable=False, index=True)


class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer(), primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password = db.Column(db.String(256))
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    profile_picture = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
