from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"

    JWT_SECRET_KEY: str = "test-secret-key-123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    OTP_HASH_SECRET: str = "mediatize-tech-hrms-otp-secret-key-2026"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_REQUEST_COOLDOWN_SECONDS: int = 60
    OTP_MAX_REQUESTS_PER_WINDOW: int = 5

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "Mediatize Tech HRMS"

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()