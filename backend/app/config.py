import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    PASSWORD = os.environ.get('PASSWORD')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')