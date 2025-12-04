from datetime import datetime

from app.models.models import User
from app import db



class UserService:
    @staticmethod
    def createUser( data):
        user = User(username = data["username"],password = data["password"],first_name = data["firstName"],last_name = data["lastName"],profile_picture= data["profilePicture"],
        is_active = True,created_at = datetime.now(),updated_at = datetime.now())
        db.session.add(user)
        db.session.commit()
        return user
    def getUser( username):
        user = User.query.filter_by(username=username).first_or_404()
        return user

    def update_score(userId, data):
        user = User.query.filter_by(id = userId).first_or_404()
        user.post_quality_avg = data['postQualityAvg']
        user.reputation_score = data['reputationScore']
        db.session.commit()
        return user