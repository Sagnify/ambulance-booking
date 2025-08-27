# app/__init__.py
from flask import Flask
from .extensions import db, migrate, bcrypt, jwt
from . import models  # ensure models are imported
from .config import config_by_name
import os

def create_app(config_name=None):
    app = Flask(__name__)

    # Pick config based on FLASK_ENV or default to development
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app.config.from_object(config_by_name[config_name])

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    return app
