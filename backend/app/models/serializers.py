from marshmallow import Schema, fields, validate, EXCLUDE

class SentimentSerializer(Schema):
    """Serializer for Sentiment model"""
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(max=10))
    code = fields.Str(required=True, validate=validate.Length(max=10))
    is_active = fields.Bool(dump_default=True)

    class Meta:
        unknown = EXCLUDE


class UserSerializer(Schema):
    """Serializer for User model"""
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(max=64))
    email = fields.Email(required=False, allow_none=True, validate=validate.Length(max=120))
    password = fields.Str(load_only=True, required=True, validate=validate.Length(max=256))
    first_name = fields.Str(required=False, validate=validate.Length(max=64))
    last_name = fields.Str(required=False, validate=validate.Length(max=64))
    profile_picture = fields.Str(required=False, allow_none=True)
    is_active = fields.Bool(dump_default=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    class Meta:
        unknown = EXCLUDE


class UserPublicSerializer(Schema):
    """Public serializer for User model (excludes sensitive data)"""
    id = fields.Int(dump_only=True)
    username = fields.Str()
    first_name = fields.Str()
    last_name = fields.Str()
    profile_picture = fields.Str()

    class Meta:
        unknown = EXCLUDE


class SymbolSerializer(Schema):
    """Serializer for Symbol model"""
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(max=10))
    code = fields.Str(required=True, validate=validate.Length(max=10))
    is_active = fields.Bool(dump_default=True)

    class Meta:
        unknown = EXCLUDE


class PostSerializer(Schema):
    """Serializer for Posts model"""
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    processed = fields.Bool(dump_default=False)
    sentiment_score = fields.Int(dump_default=0)
    user_id = fields.Int(required=True)
    sentiment = fields.Str(validate=validate.Length(max=10))
    symbol_id = fields.Int(required=True)
    image_attachment = fields.Str(required=False, allow_none=True)
    likes_count = fields.Int(dump_default=0)


    class Meta:
        unknown = EXCLUDE


class PostDetailSerializer(Schema):
    """Detailed serializer for Posts model with all related data"""
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True)
    created_at = fields.DateTime(dump_only=True)
    processed = fields.Bool(dump_default=False)
    sentiment_score = fields.Int(dump_default=0)
    sentiment = fields.Str(validate=validate.Length(max=10))
    image_attachment = fields.Str(required=False, allow_none=True)
    likes_count = fields.Int(dump_default=0)
    
    # Nested serializers
    user = fields.Nested(UserPublicSerializer, dump_only=True)
    symbol = fields.Nested(SymbolSerializer, dump_only=True)

    class Meta:
        unknown = EXCLUDE


class CommentSerializer(Schema):
    """Serializer for Comment model"""
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True, validate=validate.Length(max=10))
    parent_id = fields.Int(required=False, allow_none=True)
    post_id = fields.Int(required=True)
    is_active = fields.Bool(dump_default=True)
    user_id = fields.Int(required=True)
    created_at = fields.DateTime(dump_only=True)
    
    # Nested serializer for user
    user = fields.Nested(UserPublicSerializer, dump_only=True)

    class Meta:
        unknown = EXCLUDE


class CommentDetailSerializer(Schema):
    """Detailed serializer for Comment model with nested replies"""
    id = fields.Int(dump_only=True)
    content = fields.Str(required=True)
    is_active = fields.Bool(dump_default=True)
    created_at = fields.DateTime(dump_only=True)
    
    # Nested serializers
    user = fields.Nested(UserPublicSerializer, dump_only=True)
    replies = fields.List(fields.Nested(lambda: CommentSerializer()), dump_only=True)

    class Meta:
        unknown = EXCLUDE
