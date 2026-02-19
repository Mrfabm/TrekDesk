from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str = "postgresql://postgres:Fab%40%40%40312@localhost:5432/booking_db"
    
    # JWT settings
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Email settings
    MAIL_USERNAME: str = "your-email@example.com"
    MAIL_PASSWORD: str = "your-email-password"
    MAIL_FROM: str = "your-email@example.com"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    
    # File upload settings
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB default
    
    # API Keys
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    
    # External tools paths
    POPPLER_PATH: Optional[str] = None
    TESSERACT_PATH: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings() 