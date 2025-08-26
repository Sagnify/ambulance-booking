from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest

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
    """
    Verifies an OTP sent in a JSON request.
    Handles potential errors if the request body is not valid JSON.
    """
    try:
        data = request.json
        if data is None:
            # Handle cases where the request body is not JSON or is empty
            raise BadRequest("Request body must be valid JSON.")
            
        entered_otp = data.get("otp")

        if entered_otp == FIXED_OTP:
            return jsonify({"success": True, "message": "OTP verified successfully"}), 200
        else:
            return jsonify({"success": False, "message": "Invalid OTP"}), 200

    except BadRequest as e:
        # Catch JSON parsing errors
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        # Catch any other unexpected errors
        return jsonify({"success": False, "message": "An internal server error occurred"}), 500
