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
    from .health_routes import health_bp
    app.register_blueprint(otp_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(health_bp)

    @app.route('/')
    def api_list():
        return {
            "message": "Ambulance Booking API",
            "endpoints": {
                "Health Routes": {
                    "GET /api/health/check": "Check server and database status"
                },
                "OTP Routes": {
                    "POST /api/otp/send": "Send OTP to phone number",
                    "POST /api/otp/verify": "Verify OTP code"
                },
                "Auth Routes": {
                    "POST /api/auth/signup": "Send OTP for new user signup",
                    "POST /api/auth/signup/verify": "Verify OTP and create user",
                    "POST /api/auth/login": "Send OTP for existing user login",
                    "POST /api/auth/login/verify": "Verify OTP and authenticate user",
                    "PUT /api/auth/profile": "Update user profile details"
                }
            }
        }

    return app
