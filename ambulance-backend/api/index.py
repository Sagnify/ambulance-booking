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
    return {'message': 'Ambulance backend running!'}

# Run directly
if __name__ == '__main__':
    app.run(debug=True)
