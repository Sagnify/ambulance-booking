import os
from flask import Flask
from .extensions import db, migrate, bcrypt, jwt  # adjust imports as needed
from .config import config_by_name

def seed_sample_hospitals():
    from .models import Hospital, Driver, User
    
    # Create default user for bookings
    default_user = User(
        name='Guest User',
        phone_number='+91-0000000000',
        email='guest@ambulance.com'
    )
    db.session.add(default_user)
    
    hospitals_data = [
        {
            'name': 'SSKM Hospital',
            'address': '244, AJC Bose Road, Kolkata, West Bengal 700020',
            'contact_number': '+91-33-2223-3526',
            'latitude': 22.5448,
            'longitude': 88.3426,
            'type': 'government',
            'emergency_services': True,
            'ambulance_count': 12,
            'hospital_id': 'hospital01',
            'password': 'admin'
        },
        {
            'name': 'Apollo Gleneagles Hospital',
            'address': '58, Canal Circular Road, Kolkata, West Bengal 700054',
            'contact_number': '+91-33-2320-3040',
            'latitude': 22.5205,
            'longitude': 88.3732,
            'type': 'private',
            'emergency_services': True,
            'ambulance_count': 8,
            'hospital_id': 'hospital02',
            'password': 'admin'
        },
        {
            'name': 'Ruby General Hospital',
            'address': '16/2, Alipore Road, Kolkata, West Bengal 700027',
            'contact_number': '+91-33-3987-4444',
            'latitude': 22.5355,
            'longitude': 88.3267,
            'type': 'private',
            'emergency_services': True,
            'ambulance_count': 6,
            'hospital_id': 'hospital03',
            'password': 'admin'
        },
        {
            'name': 'Fortis Hospital Anandapur',
            'address': '730, Anandapur, EM Bypass, Kolkata, West Bengal 700107',
            'contact_number': '+91-33-6628-4444',
            'latitude': 22.5126,
            'longitude': 88.3959,
            'type': 'private',
            'emergency_services': True,
            'ambulance_count': 10,
            'hospital_id': 'hospital04',
            'password': 'admin'
        },
        {
            'name': 'Medica Superspecialty Hospital',
            'address': '127, Mukundapur, EM Bypass, Kolkata, West Bengal 700099',
            'contact_number': '+91-33-6652-0000',
            'latitude': 22.5026,
            'longitude': 88.3959,
            'type': 'private',
            'emergency_services': True,
            'ambulance_count': 7,
            'hospital_id': 'hospital05',
            'password': 'admin'
        },
        {
            'name': 'Desun Hospital',
            'address': 'Desun More, Kasba Golpark, EM Bypass, Kolkata, West Bengal 700107',
            'contact_number': '+91-33-6628-8888',
            'latitude': 22.5089,
            'longitude': 88.3876,
            'type': 'private',
            'emergency_services': True,
            'ambulance_count': 4,
            'hospital_id': 'hospital06',
            'password': 'admin'
        },
        {
            'name': 'Baghajatin State General Hospital',
            'address': 'VIP Road, Baghajatin, Kolkata, West Bengal 700086',
            'contact_number': '+91-33-2441-5678',
            'latitude': 22.4675,
            'longitude': 88.3732,
            'type': 'government',
            'emergency_services': True,
            'ambulance_count': 5,
            'hospital_id': 'hospital07',
            'password': 'admin'
        },
        {
            'name': 'Charnock Hospital',
            'address': 'Teghoria, New Town, Kolkata, West Bengal 700157',
            'contact_number': '+91-33-6606-5000',
            'latitude': 22.5889,
            'longitude': 88.4692,
            'type': 'private',
            'emergency_services': True,
            'ambulance_count': 6,
            'hospital_id': 'hospital08',
            'password': 'admin'
        }
    ]
    
    for hospital_data in hospitals_data:
        hospital = Hospital(**hospital_data)
        db.session.add(hospital)
    
    db.session.commit()

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
    try:
        from .otp_routes import otp_bp
        app.register_blueprint(otp_bp)
    except ImportError:
        pass
    
    try:
        from .auth_routes import auth_bp
        app.register_blueprint(auth_bp)
    except ImportError:
        pass
    
    try:
        from .health_routes import health_bp
        app.register_blueprint(health_bp)
    except ImportError:
        pass
    
    try:
        from .hospital_routes import hospital_bp
        app.register_blueprint(hospital_bp)
    except ImportError:
        pass

    # Initialize database tables
    with app.app_context():
        try:
            # Drop and recreate all tables to match updated schema
            db.drop_all()
            db.create_all()
            # Auto-seed hospitals after table creation
            from .models import Hospital
            if Hospital.query.count() == 0:
                seed_sample_hospitals()
        except Exception as e:
            print(f"Database initialization error: {e}")
    
    @app.route('/')
    def api_list():
        try:
            from .models import Hospital, Driver
            hospital_count = Hospital.query.count()
            driver_count = Driver.query.count()
        except Exception as e:
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
