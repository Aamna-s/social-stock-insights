from flask import jsonify

from flask import Flask, request, jsonify
from datetime import datetime

from app.services.post_service import PostService


def init_routes(app):
    @app.route('/api/posts', methods=['POST'])
    def create_post():
        # 1. Validate input

        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content required'}), 400

        try:
            # 2. Call service
            post = PostService.create_post(data)
            # 3. Return formatted response
            return jsonify({'post': post.to_dict()}), 201

        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/posts/<user_id>', methods=['GET'])
    def get_posts(user_id):
        try:
           posts = PostService.get_posts(user_id)
           posts_list = [post.to_dict() for post in posts]
           return jsonify({'posts': posts_list}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404