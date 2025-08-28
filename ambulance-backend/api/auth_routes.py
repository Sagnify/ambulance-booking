from flask import Blueprint, request, jsonify
from .models import User, db
from .otp_routes import send_otp_helper, verify_otp_helper
import traceback

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        phone_number = data.get('phone_number')
        
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(phone_number=phone_number).first()
        if existing_user:
            return jsonify({'error': 'User already exists'}), 409
        
        # Send OTP for verification
        otp_data, otp_status = send_otp_helper(phone_number)
        if otp_status != 200:
            return jsonify(otp_data), otp_status
        
        return jsonify({'message': 'OTP sent for signup verification'}), 200
    except Exception as e:
        print(f"Signup error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/signup/verify', methods=['POST'])
def signup_verify():
    try:
        data = request.get_json()
        phone_number = data.get('phone_number')
        otp = data.get('otp')
        
        if not phone_number or not otp:
            return jsonify({'error': 'Phone number and OTP are required'}), 400
        
        # Verify OTP
        verify_data, verify_status = verify_otp_helper(phone_number, otp)
        if verify_status != 200:
            return jsonify(verify_data), verify_status
        
        # Create new user
        user = User(phone_number=phone_number)
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user_id': user.id,
            'phone_number': user.phone_number
        }), 201
    except Exception as e:
        print(f"Signup verify error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    phone_number = data.get('phone_number')
    
    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400
    
    # Check if user exists
    user = User.query.filter_by(phone_number=phone_number).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Send OTP for login
    otp_response = send_otp(phone_number)
    if otp_response[1] != 200:
        return otp_response
    
    return jsonify({'message': 'OTP sent for login verification'}), 200

@auth_bp.route('/login/verify', methods=['POST'])
def login_verify():
    data = request.get_json()
    phone_number = data.get('phone_number')
    otp = data.get('otp')
    
    if not phone_number or not otp:
        return jsonify({'error': 'Phone number and OTP are required'}), 400
    
    # Verify OTP
    verify_response = verify_otp(phone_number, otp)
    if verify_response[1] != 200:
        return verify_response
    
    # Get user
    user = User.query.filter_by(phone_number=phone_number).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'message': 'Login successful',
        'user_id': user.id,
        'phone_number': user.phone_number,
        'name': user.name,
        'email': user.email
    }), 200

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update optional fields
    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        user.email = data['email']
    if 'address' in data:
        user.address = data['address']
    if 'emergency_contacts' in data:
        user.emergency_contacts = data['emergency_contacts']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'phone_number': user.phone_number,
            'address': user.address,
            'emergency_contacts': user.emergency_contacts
        }
    }), 200