import os
from flask import Flask
from .extensions import db, migrate, bcrypt, jwt  # adjust imports as needed
from .config import config_by_name

def create_app(config_name=None):
    # Set instance_path to a writable location
    instance_path = '/tmp/instance'  # /tmp is writable on Lambda or read-only filesystems
    os.makedirs(instance_path, exist_ok=True)

    app = Flask(__name__, instance_path=instance_path, instance_relative_config=True)

    # Pick config based on FLASK_ENV or default to development
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    from .otp_routes import otp_bp
    from .auth_routes import auth_bp
    app.register_blueprint(otp_bp)
    app.register_blueprint(auth_bp)
    

    return app
