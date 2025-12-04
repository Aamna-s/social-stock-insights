from flask import jsonify, request
from marshmallow import ValidationError

from app.services.post_service import PostService
from app.models.serializers import PostSerializer, PostDetailSerializer, CommentSerializer, CommentDetailSerializer


def init_routes(app):
    @app.route('/api/posts', methods=['POST'])
    def create_post():
        """Create a new post with validation"""
        data = request.get_json()
        
        # Basic validation (you can add more custom validation here)
        if not data.get('content'):
            return jsonify({'error': 'Content required'}), 400

        try:
            # Call service to create post
            post = PostService.create_post(data)
            
            # Use serializer to format response
            schema = PostSerializer()
            return jsonify({'post': schema.dump(post)}), 201

        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            return jsonify({'error': 'An error occurred while creating the post'}), 500

    @app.route('/api/posts/<user_id>', methods=['GET'])
    def get_posts(user_id):
        """Get all posts for a specific user"""
        try:
            posts = PostService.get_posts(user_id)
            
            # Use serializer to format response
            schema = PostSerializer(many=True)
            return jsonify({'posts': schema.dump(posts)}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while fetching posts'}), 500

    @app.route('/api/posts/symbol/<symbol_code>', methods=['GET'])
    def get_posts_by_symbol(symbol_code):
        """Get all posts for a specific user"""
        try:
            posts = PostService.get_posts_by_symbol(symbol_code)

            # Use serializer to format response
            schema = PostSerializer(many=True)
            return jsonify({'posts': schema.dump(posts)}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while fetching posts'}), 500
    @app.route('/api/posts', methods=['GET'])
    def get_all_posts():
        """Get all posts"""
        try:
            posts = PostService.get_all_posts()
            
            # Use serializer to format response
            schema = PostDetailSerializer(many=True)
            return jsonify({'posts': schema.dump(posts)}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while fetching posts'}), 500

    @app.route('/api/posts/<post_id>/like', methods=['POST'])
    def post_like(post_id):
        """Like a post"""
        try:
            post = PostService.post_like(post_id)
            
            # Use serializer to format response
            schema = PostSerializer()
            return jsonify({'post': schema.dump(post)}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while liking the post'}), 500

    @app.route("/api/posts/<post_id>/comments", methods=['POST'])
    def add_comment(post_id):
        try:
            data = request.get_json()
            comment = PostService.add_comment(data, post_id)
            schema = CommentSerializer()
            return jsonify({'comment': schema.dump(comment)})
        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while adding comment'}), 500

    @app.route('/api/posts/<post_id>/comments', methods=['GET'])
    def get_comments(post_id):
        try:
            comments = PostService.get_comments_with_replies(post_id)

            return jsonify({'comments': comments}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while fetching comments'}), 500

    @app.route('/api/posts/<post_id>/comments/<comment_id>/replies', methods=['GET'])
    def get_comments_replies(comment_id):
        try:
            comments = PostService.get_comments_replies(comment_id)

            schema = CommentDetailSerializer(many=True)
            return jsonify({'comments': schema.dump(comments)}), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 404
        except Exception as e:
            return jsonify({'error': 'An error occurred while fetching comments'}), 500