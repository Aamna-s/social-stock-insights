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
            post = PostService.create_post(
                user_id=data.user,
                content=data['content'],
                sentiment=data.get('sentiment'),
                symbol=data.symbol
            )
            # 3. Return formatted response
            return jsonify({'post': post.to_dict()}), 201

        except ValueError as e:
            return jsonify({'error': str(e)}), 400