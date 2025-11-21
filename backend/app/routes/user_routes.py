from flask import request, jsonify

from app.services.user_service import UserService


def init_routes(app):
    @app.route('/api/users', methods=['POST'])
    def create_user():
        data = request.get_json()
        try:
            user = UserService.createUser(data)
            return jsonify({'user': user.to_dict()}), 201
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

