from .user_routes import init_routes as user_routes
from .posts_routes import init_routes as post_routes

def init_routes(app):
    user_routes(app)
    post_routes(app)