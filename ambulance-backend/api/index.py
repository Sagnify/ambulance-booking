# from flask import Flask, jsonify, request
# from flask_cors import CORS
# from .otp_routes import otp_bp

# app = Flask(__name__)
# CORS(app)

# # Register OTP Blueprint
# app.register_blueprint(otp_bp)

# @app.route('/')
# def home():
#     return jsonify({'message': 'Ambulance backend running!'})

# if __name__ == '__main__':
#     app.run(debug=True)

# index.py
from api import create_app
from flask_cors import CORS

# Create app via factory
app = create_app()
CORS(app)

# Root route
@app.route('/')
def home():
    return {
            "message": "Ambulance Booking API",
            "endpoints": {
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

# Run directly
if __name__ == '__main__':
    app.run(debug=True)
