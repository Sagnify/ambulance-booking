# app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (only in dev; production should set real env vars)
root = Path(__file__).resolve().parents[1]
dotenv_path = root / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)

def _bool(v: str | None, default: bool = False) -> bool:
    if v is None:
        return default
    return v.lower() in ("1", "true", "yes", "on")

class BaseConfig:
    # Secrets
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-too")

    # Database: prefer DATABASE_URL (pooled) then DATABASE_URL_UNPOOLED then sqlite dev file
    SQLALCHEMY_DATABASE_URI = (
        os.getenv("DATABASE_URL")
        or os.getenv("DATABASE_URL_UNPOOLED")
        or os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///dev.db")
    )

    # Useful extras if you want to know the unpooled host/url for special cases
    DATABASE_URL = os.getenv("DATABASE_URL")
    DATABASE_URL_UNPOOLED = os.getenv("DATABASE_URL_UNPOOLED")
    PGHOST = os.getenv("PGHOST")
    PGUSER = os.getenv("PGUSER")
    PGDATABASE = os.getenv("PGDATABASE")
    PGPASSWORD = os.getenv("PGPASSWORD")

    # SQLAlchemy options
    SQLALCHEMY_TRACK_MODIFICATIONS = _bool(os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS"), False)

    # OTP
    OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))

    # Environment helpers
    DEBUG = False
    TESTING = False

class DevelopmentConfig(BaseConfig):
    DEBUG = True
    # Optionally override DB for local dev explicitly:
    # SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///dev.db")

class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URI", "sqlite:///:memory:")

class ProductionConfig(BaseConfig):
    DEBUG = False

config_by_name = dict(
    development=DevelopmentConfig,
    testing=TestingConfig,
    production=ProductionConfig,
)
