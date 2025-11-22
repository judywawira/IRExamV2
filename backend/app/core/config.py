"""
Application Configuration
Loaded from environment variables
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "irexam_db"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png"]

    # Environment
    ENVIRONMENT: str = "development"

    # Admin Seed
    ADMIN_EMAIL: str = "admin@irexam.com"
    ADMIN_PASSWORD: str = "Admin@123"
    ADMIN_FIRST_NAME: str = "System"
    ADMIN_LAST_NAME: str = "Administrator"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
