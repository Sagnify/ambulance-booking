from flask import Flask, jsonify, request
from flask_cors import CORS
from otp_routes import otp_bp

app = Flask(__name__)
CORS(app)

# Register OTP Blueprint
app.register_blueprint(otp_bp)

@app.route('/')
def home():
    return jsonify({'message': 'Ambulance backend running!'})

if __name__ == '__main__':
    app.run(debug=True)
