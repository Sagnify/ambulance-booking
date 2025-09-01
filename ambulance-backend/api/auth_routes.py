from flask import Blueprint, request, jsonify
from .models import User, db
from .otp_routes import send_otp_helper, verify_otp_helper
import traceback
import jwt
import os
from functools import wraps
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# JWT Secret Key (in production, use environment variable)
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated

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
        token = jwt.encode({
            'user_id': user.id,
            'phone_number': user.phone_number,
            'exp': datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm='HS256')
        
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
        token = jwt.encode({
            'user_id': user.id,
            'phone_number': user.phone_number,
            'exp': datetime.utcnow() + timedelta(days=30)
        }, JWT_SECRET, algorithm='HS256')
        
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
@token_required
def update_profile(current_user_id):
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
@token_required
def get_user(current_user_id, user_id):
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