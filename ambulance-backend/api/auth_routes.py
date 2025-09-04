from flask import Blueprint, request, jsonify
from .models import User, db
from .otp_routes import send_otp_helper, verify_otp_helper
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import traceback
import os
from datetime import timedelta

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Remove custom token_required decorator - using flask_jwt_extended instead

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
        
        # Generate JWT token for new user
        token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30),
            additional_claims={
                "user_type": "user",
                "phone_number": user.phone_number
            }
        )
        
        return jsonify({
            'message': 'User created successfully',
            'user_id': user.id,
            'phone_number': user.phone_number,
            'token': token
        }), 201
    except Exception as e:
        print(f"Signup verify error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        phone_number = data.get('phone_number')
        
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400
        
        # Check if user exists
        user = User.query.filter_by(phone_number=phone_number).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Send OTP for login
        otp_data, otp_status = send_otp_helper(phone_number)
        if otp_status != 200:
            return jsonify(otp_data), otp_status
        
        return jsonify({'message': 'OTP sent for login verification'}), 200
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login/verify', methods=['POST'])
def login_verify():
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
        
        # Get user
        user = User.query.filter_by(phone_number=phone_number).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate JWT token
        token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=30),
            additional_claims={
                "user_type": "user",
                "phone_number": user.phone_number
            }
        )
        
        return jsonify({
            'message': 'Login successful',
            'user_id': user.id,
            'phone_number': user.phone_number,
            'name': user.name,
            'email': user.email,
            'token': token
        }), 200
    except Exception as e:
        print(f"Login verify error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    user = User.query.get(current_user_id)
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

@auth_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user_id = int(get_jwt_identity())
    try:
        # Ensure user can only access their own data
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'phone_number': user.phone_number,
            'address': user.address,
            'emergency_contacts': user.emergency_contacts,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    try:
        users = User.query.all()
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'phone_number': user.phone_number,
                'address': user.address,
                'emergency_contacts': user.emergency_contacts,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        return jsonify({'users': users_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500