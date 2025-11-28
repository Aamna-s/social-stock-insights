from flask import request, jsonify

from app.services.user_service import UserService
from app.models.serializers import UserSerializer, UserPublicSerializer


def init_routes(app):
    @app.route('/api/users', methods=['POST'])
    def create_user():
        """Create a new user with validation"""
        data = request.get_json()
        
        try:
            # Call service to create user
            user = UserService.createUser(data)
            
            # Use serializer to format response (excludes password)
            schema = UserSerializer()
            return jsonify({'user': schema.dump(user)}), 201
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            return jsonify({'error': 'An error occurred while creating the user'}), 500

    @app.route('/api/users/<username>', methods=['GET'])
    def get_user(username):
        """Get user by username"""
        try:
            user = UserService.getUser(username)
            
            # Use public serializer (excludes sensitive data like email)
            schema = UserPublicSerializer()
            return jsonify({'user': schema.dump(user)}), 200
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while fetching the user'}), 500