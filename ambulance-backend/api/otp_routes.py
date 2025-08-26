from flask import Blueprint, request, jsonify

otp_bp = Blueprint('otp', __name__)

FIXED_OTP = "123456"

@otp_bp.route('/send-otp', methods=['POST'])
def send_otp():
    return jsonify({"message": "OTP sent successfully (testing mode)"})

@otp_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    entered_otp = data.get("otp")

    if entered_otp == FIXED_OTP:
        return jsonify({"success": True, "message": "OTP verified successfully"})
    else:
        return jsonify({"success": False, "message": "Invalid OTP"})
