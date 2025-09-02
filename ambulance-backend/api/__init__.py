import os
from flask import Flask
from .extensions import db, migrate, bcrypt, jwt  # adjust imports as needed
from .config import config_by_name

def create_app(config_name=None):
    # Set instance_path to a writable location
    instance_path = '/tmp/instance'  # /tmp is writable on Lambda or read-only filesystems
    os.makedirs(instance_path, exist_ok=True)
    
    # Set template folder to the correct path
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
    app = Flask(__name__, instance_path=instance_path, instance_relative_config=True, template_folder=template_dir)

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
    try:
        from .hospital_routes import hospital_bp
        app.register_blueprint(hospital_bp)
    except ImportError:
        pass
    app.register_blueprint(otp_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(health_bp)

    @app.route('/')
    def api_list():
        from .models import Hospital, Driver
        
        # Get hospital count
        try:
            hospital_count = Hospital.query.count()
            driver_count = Driver.query.count()
        except:
            hospital_count = 0
            driver_count = 0
            
        return {
            "message": "Ambulance Booking API",
            "statistics": {
                "total_hospitals": hospital_count,
                "total_drivers": driver_count,
                "total_organizations": hospital_count  # Same as hospitals for now
            },
            "endpoints": {
                "Health Routes": {
                    "GET /api/health/check": "Check server and database status"
                },
                "Hospital Routes": {
                    "GET /api/hospitals": "Get list of all hospitals and organizations",
                    "GET /api/hospitals/nearby": "Get nearby hospitals (params: lat, lng, radius)",
                    "POST /api/hospitals/seed": "Populate database with Kolkata hospitals (sample data)"
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
                },
                "Driver Routes": {
                    "GET /api/drivers": "Get all drivers from all hospitals with details"
                }
            }
        }

    return app
