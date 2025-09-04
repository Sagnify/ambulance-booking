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
from api.extensions import db
from flask_cors import CORS
from flask import render_template, request
from api.webrtc_signaling import webrtc_bp

# Create app via factory
app = create_app()
CORS(app)

# Register WebRTC signaling blueprint
app.register_blueprint(webrtc_bp, url_prefix='/api')



# Database health check
@app.route('/api/health')
def health_check():
    from flask import jsonify
    from .models import Hospital, Driver, Booking
    
    try:
        # Test database connection
        hospital_count = Hospital.query.count()
        driver_count = Driver.query.count()
        booking_count = Booking.query.count()
        
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "counts": {
                "hospitals": hospital_count,
                "drivers": driver_count,
                "bookings": booking_count
            }
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database": "error",
            "error": str(e)
        }), 500

# Database reset endpoint - DISABLED for data safety
@app.route('/api/reset-db', methods=['POST'])
def reset_database():
    from flask import jsonify
    return jsonify({"error": "Database reset disabled for data safety"}), 403

# Hospital Dashboard Routes
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/dashboard/login')
def dashboard_login():
    return render_template('login.html')

@app.route('/webrtc-dashboard')
def webrtc_dashboard():
    return render_template('webrtc-hospital.html')

# Hospital Login API
@app.route('/api/hospital/login', methods=['POST'])
def hospital_login():
    from flask import request, jsonify
    from .models import Hospital
    
    data = request.get_json()
    hospital_id = data.get('hospital_id')
    password = data.get('password')
    
    if hospital_id and password == "admin":
        hospital = Hospital.query.filter_by(hospital_id=hospital_id).first()
        if hospital:
            return jsonify({
                "token": f"hospital_{hospital.id}",
                "hospital_id": hospital.id,
                "hospital_name": hospital.name,
                "message": "Login successful"
            })
    
    return jsonify({"message": "Invalid credentials"}), 401



# Hospital Dashboard Data
@app.route('/api/hospital/<int:hospital_id>/dashboard')
def hospital_dashboard_data(hospital_id):
    from flask import jsonify
    from .models import Hospital, Driver, Booking
    from datetime import datetime
    
    hospital = Hospital.query.get_or_404(hospital_id)
    drivers = Driver.query.filter_by(hospital_id=hospital_id).all()
    
    # Get real stats
    available_drivers = len([d for d in drivers if d.status == 'Available'])
    busy_drivers = len([d for d in drivers if d.status == 'Busy'])
    total_bookings = Booking.query.count()
    
    return jsonify({
        "hospital": {
            "name": hospital.name,
            "address": hospital.address,
            "contact": hospital.contact_number,
            "email": hospital.email
        },
        "stats": {
            "available_ambulances": available_drivers,
            "busy_ambulances": busy_drivers,
            "total_drivers": len(drivers),
            "total_bookings": total_bookings
        },
        "drivers": [{
            "id": d.id,
            "name": d.name,
            "phone": d.phone_number,
            "license_number": d.license_number,
            "vehicle": d.vehicle_number,
            "status": d.status,
            "location": f"{d.current_latitude},{d.current_longitude}" if d.current_latitude and d.current_longitude else "Unknown",
            "login_id": d.driver_id,
            "password": d.password
        } for d in drivers],
        "pending_bookings": [{
            "id": b.id,
            "booking_type": b.booking_type,
            "emergency_type": b.emergency_type,
            "severity": b.severity,
            "pickup_location": b.pickup_location,
            "pickup_latitude": b.pickup_latitude,
            "pickup_longitude": b.pickup_longitude,
            "patient_name": b.patient_name,
            "patient_phone": b.patient_phone,
            "requested_at": b.requested_at.isoformat(),
            "time_remaining": max(0, 30 - int((datetime.utcnow() - b.requested_at).total_seconds()))
        } for b in Booking.query.filter_by(hospital_id=hospital_id, status='Pending').all()],
        "ongoing_bookings": [{
            "id": b.id,
            "booking_type": b.booking_type,
            "emergency_type": b.emergency_type,
            "severity": b.severity,
            "pickup_location": b.pickup_location,
            "pickup_latitude": b.pickup_latitude,
            "pickup_longitude": b.pickup_longitude,
            "patient_name": b.patient_name,
            "patient_phone": b.patient_phone,
            "status": b.status,
            "assigned_at": b.assigned_at.isoformat() if b.assigned_at else None,
            "auto_assigned": b.auto_assigned,
            "ambulance": {
                "driver_name": Driver.query.get(b.ambulance_id).name if b.ambulance_id else None,
                "driver_phone": Driver.query.get(b.ambulance_id).phone_number if b.ambulance_id else None,
                "vehicle_number": Driver.query.get(b.ambulance_id).vehicle_number if b.ambulance_id else None
            } if b.ambulance_id else None
        } for b in Booking.query.filter_by(hospital_id=hospital_id).filter(Booking.status.in_(['Assigned', 'On Route', 'Arrived'])).all()]
    })

# Driver Management APIs
@app.route('/api/hospital/<int:hospital_id>/drivers', methods=['POST'])
def add_driver(hospital_id):
    from flask import request, jsonify
    from .models import Driver
    import re
    
    data = request.get_json()
    
    # Generate driver_id from name (remove spaces, lowercase, add numbers)
    name_clean = re.sub(r'[^a-zA-Z]', '', data['name']).lower()
    existing_count = Driver.query.filter(Driver.driver_id.like(f"{name_clean}%")).count()
    driver_login_id = f"{name_clean}{existing_count + 1:02d}"  # e.g., john01, john02
    
    driver = Driver(
        name=data['name'],
        phone_number=data['phone'],
        license_number=data.get('license_number', f'LIC{existing_count + 1:04d}'),
        vehicle_number=data['vehicle'],
        hospital_id=hospital_id,
        status='Available',
        driver_id=driver_login_id,
        password='driver123'
    )
    
    db.session.add(driver)
    db.session.commit()
    
    return jsonify({
        "message": "Driver and ambulance added successfully",
        "driver_id": driver.id,
        "login_id": driver_login_id,
        "password": "driver123"
    })

@app.route('/api/hospital/<int:hospital_id>/drivers/<int:driver_id>', methods=['PUT'])
def update_driver(hospital_id, driver_id):
    from flask import request, jsonify
    from .models import Driver
    
    driver = Driver.query.filter_by(id=driver_id, hospital_id=hospital_id).first_or_404()
    data = request.get_json()
    
    driver.name = data.get('name', driver.name)
    driver.phone_number = data.get('phone', driver.phone_number)
    driver.vehicle_number = data.get('vehicle', driver.vehicle_number)
    driver.status = data.get('status', driver.status)
    
    db.session.commit()
    
    return jsonify({"message": "Driver updated successfully"})

@app.route('/api/hospital/<int:hospital_id>/drivers/<int:driver_id>', methods=['DELETE'])
def delete_driver(hospital_id, driver_id):
    from flask import jsonify
    from .models import Driver
    
    driver = Driver.query.filter_by(id=driver_id, hospital_id=hospital_id).first_or_404()
    db.session.delete(driver)
    db.session.commit()
    
    return jsonify({"message": "Driver deleted successfully"})

# Booking APIs
@app.route('/api/bookings', methods=['POST'])
def create_booking():
    from flask import request, jsonify
    from .models import Booking, Driver, Hospital, User
    from flask_jwt_extended import get_jwt_identity, get_jwt
    import json
    
    try:
        # Verify JWT token
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        # Ensure it's a user token (not driver)
        if claims.get('user_type') == 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception as e:
        return jsonify({"error": "Invalid or missing token"}), 401
        
        # Ensure tables exist
        with app.app_context():
            db.create_all()
            
            # Check if hospitals exist, if not seed them
            if Hospital.query.count() == 0:
                from . import seed_sample_hospitals
                seed_sample_hospitals()
        
        data = request.get_json()
        
        # Validate hospital exists
        hospital = Hospital.query.get(data['hospital_id'])
        if not hospital:
            return jsonify({
                "error": "Hospital not found",
                "message": "Invalid hospital ID"
            }), 400
        
        # Get authenticated user
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        booking = Booking(
            user_id=current_user_id,
            hospital_id=data['hospital_id'],
            pickup_location=data['pickup_location'],
            pickup_latitude=data.get('pickup_latitude'),
            pickup_longitude=data.get('pickup_longitude'),
            destination=data.get('destination'),
            booking_type=data['booking_type'],
            emergency_type=data.get('emergency_type'),
            severity=data.get('severity'),
            accident_details=json.dumps(data.get('accident_details', {})),
            patient_name=data.get('patient_name'),
            patient_phone=data.get('patient_phone')
        )
        
        db.session.add(booking)
        db.session.commit()
        
        return jsonify({
            "booking_id": booking.id,
            "status": "Pending",
            "message": "Booking created successfully"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": str(e),
            "message": "Failed to create booking"
        }), 500

@app.route('/api/bookings/<int:booking_id>/assign', methods=['POST'])
def assign_ambulance(booking_id):
    from flask import request, jsonify
    from .models import Booking, Driver
    from datetime import datetime
    
    data = request.get_json()
    driver_id = data.get('driver_id')
    
    booking = Booking.query.get_or_404(booking_id)
    driver = Driver.query.get_or_404(driver_id)
    
    booking.ambulance_id = driver_id
    booking.status = 'Assigned'
    booking.assigned_at = datetime.utcnow()
    driver.status = 'Busy'
    
    db.session.commit()
    
    return jsonify({"message": "Ambulance assigned successfully"})

@app.route('/api/bookings/<int:booking_id>/auto-assign', methods=['POST'])
def auto_assign_ambulance(booking_id):
    from flask import jsonify
    from .models import Booking, Driver
    from datetime import datetime
    
    booking = Booking.query.get_or_404(booking_id)
    
    # Find available driver from same hospital
    available_driver = Driver.query.filter_by(
        hospital_id=booking.hospital_id,
        status='Available'
    ).first()
    
    if available_driver:
        booking.ambulance_id = available_driver.id
        booking.status = 'Assigned'
        booking.assigned_at = datetime.utcnow()
        booking.auto_assigned = True
        available_driver.status = 'Busy'
        
        db.session.commit()
        
        return jsonify({
            "message": "Ambulance auto-assigned",
            "driver": {
                "name": available_driver.name,
                "phone": available_driver.phone_number,
                "vehicle": available_driver.vehicle_number
            }
        })
    
    return jsonify({"message": "No available ambulance"}), 404

@app.route('/api/bookings/<int:booking_id>/status')
def get_booking_status(booking_id):
    from flask import jsonify
    from .models import Booking, Driver, Hospital
    from flask_jwt_extended import get_jwt_identity, get_jwt
    
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        # Allow both users and drivers to check booking status
        if claims.get('user_type') == 'driver':
            # Driver can check bookings assigned to them
            booking = Booking.query.filter_by(id=booking_id, ambulance_id=current_user_id).first()
        else:
            # User can check their own bookings
            booking = Booking.query.filter_by(id=booking_id, user_id=current_user_id).first()
            
        if not booking:
            return jsonify({"error": "Booking not found or unauthorized"}), 404
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    result = {
        "id": booking.id,
        "status": booking.status,
        "booking_type": booking.booking_type,
        "pickup_location": booking.pickup_location,
        "requested_at": booking.requested_at.isoformat(),
        "auto_assigned": booking.auto_assigned
    }
    
    if booking.ambulance_id:
        driver = Driver.query.get(booking.ambulance_id)
        result["ambulance"] = {
            "driver_name": driver.name,
            "driver_phone": driver.phone_number,
            "vehicle_number": driver.vehicle_number,
            "assigned_at": booking.assigned_at.isoformat() if booking.assigned_at else None
        }
    
    return jsonify(result)

# All Drivers API
@app.route('/api/drivers')
def get_all_drivers():
    from flask import jsonify
    from .models import Driver, Hospital
    
    drivers = db.session.query(Driver, Hospital).join(Hospital, Driver.hospital_id == Hospital.id).all()
    
    return jsonify({
        "total_drivers": len(drivers),
        "drivers": [{
            "id": driver.id,
            "name": driver.name,
            "phone": driver.phone_number,
            "vehicle_number": driver.vehicle_number,
            "status": driver.status,
            "location": driver.current_location,
            "login_id": driver.driver_id,
            "hospital": {
                "id": hospital.id,
                "name": hospital.name,
                "address": hospital.address,
                "contact": hospital.contact_number
            }
        } for driver, hospital in drivers]
    })

# Driver Authentication APIs
@app.route('/driver/login', methods=['POST'])
def driver_login():
    from flask import request, jsonify
    from .models import Driver, Hospital
    from flask_jwt_extended import create_access_token
    
    data = request.get_json()
    login_id = data.get('login_id')
    password = data.get('password')
    
    if not login_id or not password:
        return jsonify({"error": "Login ID and password required"}), 400
    
    driver = Driver.query.filter_by(driver_id=login_id, password=password).first()
    
    if driver:
        hospital = Hospital.query.get(driver.hospital_id)
        
        # Create JWT token
        access_token = create_access_token(
            identity=str(driver.id),
            additional_claims={
                "user_type": "driver",
                "hospital_id": driver.hospital_id
            }
        )
        
        return jsonify({
            "access_token": access_token,
            "driver": {
                "id": driver.id,
                "name": driver.name,
                "phone": driver.phone_number,
                "license_number": driver.license_number,
                "hospital_id": driver.hospital_id,
                "is_available": driver.is_available,
                "current_latitude": driver.current_latitude,
                "current_longitude": driver.current_longitude,
                "hospital_name": hospital.name if hospital else None
            }
        })
    
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/driver/location', methods=['POST'])
def update_driver_location():
    from flask import request, jsonify
    from .models import Driver
    from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
    
    try:
        # Verify JWT token
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        
        current_driver_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') != 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    data = request.get_json()
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if not all([latitude, longitude]):
        return jsonify({"error": "Latitude and longitude required"}), 400
    
    driver = Driver.query.get(current_driver_id)
    if not driver:
        return jsonify({"error": "Driver not found"}), 404
    
    driver.current_latitude = latitude
    driver.current_longitude = longitude
    db.session.commit()
    
    return jsonify({"message": "Location updated successfully"})

@app.route('/driver/bookings')
def get_driver_bookings():
    from flask import jsonify
    from .models import Booking, Hospital
    from flask_jwt_extended import get_jwt_identity, get_jwt
    
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        
        current_driver_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') != 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    bookings = Booking.query.filter_by(ambulance_id=current_driver_id).filter(
        Booking.status.in_(['assigned', 'en_route', 'arrived'])
    ).all()
    
    result = []
    for booking in bookings:
        hospital = Hospital.query.get(booking.hospital_id)
        result.append({
            "id": booking.id,
            "user_phone": booking.patient_phone or booking.user.phone_number if booking.user else 'Unknown',
            "hospital_id": booking.hospital_id,
            "driver_id": booking.ambulance_id,
            "pickup_latitude": booking.pickup_latitude,
            "pickup_longitude": booking.pickup_longitude,
            "status": booking.status,
            "created_at": booking.requested_at.isoformat(),
            "hospital_name": hospital.name if hospital else None,
            "hospital_address": hospital.address if hospital else None
        })
    
    return jsonify(result)

@app.route('/booking/status', methods=['POST'])
def update_booking_status():
    from flask import request, jsonify
    from .models import Booking, Driver
    from datetime import datetime
    
    data = request.get_json()
    booking_id = data.get('booking_id')
    status = data.get('status')
    
    if not booking_id or not status:
        return jsonify({"error": "Booking ID and status required"}), 400
    
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    
    booking.status = status
    
    if status == 'completed':
        booking.completed_at = datetime.utcnow()
        # Make driver available again
        if booking.ambulance_id:
            driver = Driver.query.get(booking.ambulance_id)
            if driver:
                driver.status = 'Available'
    
    db.session.commit()
    
    return jsonify({"message": "Booking status updated successfully"})

@app.route('/driver/availability', methods=['POST'])
def set_driver_availability():
    from flask import request, jsonify
    from .models import Driver
    from flask_jwt_extended import get_jwt_identity, get_jwt
    
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        
        current_driver_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') != 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    data = request.get_json()
    is_available = data.get('is_available')
    
    if is_available is None:
        return jsonify({"error": "Availability status required"}), 400
    
    driver = Driver.query.get(current_driver_id)
    if not driver:
        return jsonify({"error": "Driver not found"}), 404
    
    driver.is_available = is_available
    driver.status = 'Available' if is_available else 'Offline'
    db.session.commit()
    
    return jsonify({"message": "Availability updated successfully"})

@app.route('/api/users/<int:user_id>')
def get_user(user_id):
    from flask import jsonify
    from .models import User
    from flask_jwt_extended import get_jwt_identity, get_jwt
    
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        # Ensure it's a user token and user can only access their own data
        if claims.get('user_type') == 'driver' or current_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user.id,
        "name": user.name,
        "phone_number": user.phone_number,
        "email": user.email
    })

# Run directly
if __name__ == '__main__':
    app.run(debug=True)
