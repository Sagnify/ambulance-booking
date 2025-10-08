from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from .models import Booking, User, Driver

def validate_user_token(f):
    """Decorator to validate user JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = int(get_jwt_identity())
            claims = get_jwt()
            
            if claims.get('user_type') == 'driver':
                return jsonify({"error": "Invalid token type - user token required"}), 403
                
            # Verify user exists
            user = User.query.get(current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404
                
            return f(current_user_id, *args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401
    return decorated_function

def validate_driver_token(f):
    """Decorator to validate driver JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_driver_id = int(get_jwt_identity())
            claims = get_jwt()
            
            if claims.get('user_type') != 'driver':
                return jsonify({"error": "Invalid token type - driver token required"}), 403
                
            # Verify driver exists
            driver = Driver.query.get(current_driver_id)
            if not driver:
                return jsonify({"error": "Driver not found"}), 404
                
            return f(current_driver_id, *args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401
    return decorated_function

def validate_no_ongoing_booking(f):
    """Decorator to prevent new bookings if user has ongoing booking"""
    @wraps(f)
    def decorated_function(user_id, *args, **kwargs):
        ongoing_booking = Booking.query.filter_by(user_id=user_id).filter(
            Booking.status.in_(['Pending', 'Assigned', 'On Route', 'Arrived'])
        ).first()
        
        if ongoing_booking:
            return jsonify({
                "error": "Ongoing booking exists",
                "message": "Please complete your current booking before creating a new one",
                "ongoing_booking_id": ongoing_booking.id
            }), 409
            
        return f(user_id, *args, **kwargs)
    return decorated_function

def validate_booking_ownership(f):
    """Decorator to validate booking belongs to user or driver"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = int(get_jwt_identity())
            claims = get_jwt()
            
            booking_id = kwargs.get('booking_id') or args[0] if args else None
            if not booking_id:
                return jsonify({"error": "Booking ID required"}), 400
                
            booking = Booking.query.get(booking_id)
            if not booking:
                return jsonify({"error": "Booking not found"}), 404
                
            # Check ownership based on token type
            if claims.get('user_type') == 'driver':
                if booking.ambulance_id != current_user_id:
                    return jsonify({"error": "Unauthorized - booking not assigned to this driver"}), 403
            else:
                if booking.user_id != current_user_id:
                    return jsonify({"error": "Unauthorized - booking does not belong to this user"}), 403
                    
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Validation failed", "details": str(e)}), 401
    return decorated_function

def validate_request_data(required_fields):
    """Decorator to validate required fields in request JSON"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({"error": "Content-Type must be application/json"}), 400
                
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body is required"}), 400
                
            missing_fields = [field for field in required_fields if field not in data or data[field] is None]
            if missing_fields:
                return jsonify({
                    "error": "Missing required fields",
                    "missing_fields": missing_fields
                }), 400
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_hospital_access(f):
    """Decorator to validate hospital dashboard access"""
    @wraps(f)
    def decorated_function(hospital_id, *args, **kwargs):
        from .models import Hospital
        
        hospital = Hospital.query.get(hospital_id)
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404
            
        # Additional hospital access validation can be added here
        return f(hospital_id, *args, **kwargs)
    return decorated_function