from flask import Blueprint, request, jsonify

otp_bp = Blueprint('otp', __name__)

FIXED_OTP = "1234"

@otp_bp.route('/send-otp', methods=['POST'])
def send_otp():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "Request body is missing or invalid JSON"}), 400
        
        phone = data.get("phone")
        if not phone:
            return jsonify({"success": False, "message": "Phone number is required"}), 400

        # Basic validation for phone number format (you can improve this)
        if not phone.isdigit() or len(phone) < 10:
            return jsonify({"success": False, "message": "Invalid phone number format"}), 400

        # Here you would normally generate and send OTP (SMS/Email)
        # For now, just mock it
        print(f"Generated OTP for {phone}: {FIXED_OTP}")  # For debugging (remove in production)

        return jsonify({"success": True, "message": "OTP sent successfully (testing mode)"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@otp_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    entered_otp = data.get("otp")

    if entered_otp == FIXED_OTP:
        return jsonify({"success": True, "message": "OTP verified successfully"})
    else:
        return jsonify({"success": False, "message": "Invalid OTP"})
