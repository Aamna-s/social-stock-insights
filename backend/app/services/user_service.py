from datetime import datetime

from app.models.models import User
from flask_sqlalchemy import SQLAlchemy



class UserService:
    @staticmethod
    def createUser( data):
        db = SQLAlchemy()
        user = User(username = data.username,password = data.password,first_name = data.firstName,last_name = data.lastName,
        profile_picture = data.profilePicture,is_active = True,created_at = datetime.now(),updated_at = datetime.now())
        db.session.add(user)
        db.session.commit()
        return user
