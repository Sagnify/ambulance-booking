from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest

otp_bp = Blueprint('otp', __name__)

FIXED_OTP = "1234"

# Helper functions for internal use
def send_otp_helper(phone_number):
    """Helper function to send OTP - returns (response_data, status_code)"""
    try:
        if not phone_number:
            return {'error': 'Phone number is required'}, 400
        
        # Clean phone number for validation
        clean_phone = phone_number.replace('+', '').replace('-', '').replace(' ', '')
        
        if not clean_phone.isdigit() or len(clean_phone) < 10:
            return {'error': 'Invalid phone number format'}, 400
        
        print(f"Generated OTP for {phone_number}: {FIXED_OTP}")
        return {'message': 'OTP sent successfully'}, 200
    except Exception as e:
        return {'error': f'Server error: {str(e)}'}, 500

def verify_otp_helper(phone_number, otp):
    """Helper function to verify OTP - returns (response_data, status_code)"""
    try:
        if not phone_number or not otp:
            return {'error': 'Phone number and OTP are required'}, 400
        
        # Clean phone number for comparison
        clean_phone = phone_number.replace('+', '').replace('-', '').replace(' ', '')
        
        if otp == FIXED_OTP:
            return {'message': 'OTP verified successfully'}, 200
        else:
            return {'error': 'Invalid OTP'}, 400
    except Exception as e:
        return {'error': f'Server error: {str(e)}'}, 500

@otp_bp.route('/send-otp', methods=['POST'])
def send_otp():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "Request body is missing or invalid JSON"}), 400
        
        phone = data.get("phone")
        response_data, status_code = send_otp_helper(phone)
        
        if status_code == 200:
            return jsonify({"success": True, "message": response_data['message']}), 200
        else:
            return jsonify({"success": False, "message": response_data['error']}), status_code

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
            raise BadRequest("Request body must be valid JSON.")
            
        phone = data.get("phone")
        entered_otp = data.get("otp")
        
        response_data, status_code = verify_otp_helper(phone, entered_otp)
        
        if status_code == 200:
            return jsonify({"success": True, "message": response_data['message']}), 200
        else:
            return jsonify({"success": False, "message": response_data['error']}), status_code

    except BadRequest as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": "An internal server error occurred"}), 500
