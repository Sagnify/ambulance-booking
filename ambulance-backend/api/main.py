from api import create_app
from api.extensions import db
from flask_cors import CORS
from flask import render_template, request, jsonify
from api.scheduler import start_scheduler

# Create app via factory
app = create_app()
CORS(app)

# Register webrtc blueprint that's not in __init__.py
try:
    from api.webrtc_signaling import webrtc_bp
    app.register_blueprint(webrtc_bp)
except ImportError:
    pass

# Register PeerPyRTC service
try:
    from api.peerpyrtc_service import peerpyrtc_bp
    app.register_blueprint(peerpyrtc_bp)
except ImportError:
    pass

# Register feature check service
try:
    from api.feature_check import feature_check_bp
    app.register_blueprint(feature_check_bp)
except ImportError:
    pass

# Database health check
@app.route('/api/health')
def health_check():
    from .models import Hospital, Driver, Booking
    
    try:
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

# Clear all bookings endpoint
@app.route('/api/clear-bookings', methods=['POST'])
def clear_bookings():
    from .models import Booking, Driver
    
    try:
        Booking.query.delete()
        Driver.query.update({Driver.status: 'Available'})
        db.session.commit()
        return jsonify({"message": "All bookings cleared and drivers reset to available"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

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
    from .models import Hospital, Driver, Booking
    from datetime import datetime
    
    hospital = Hospital.query.get_or_404(hospital_id)
    drivers = Driver.query.filter_by(hospital_id=hospital_id).all()
    
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
    from .models import Driver
    import re
    
    data = request.get_json()
    
    name_clean = re.sub(r'[^a-zA-Z]', '', data['name']).lower()
    existing_count = Driver.query.filter(Driver.driver_id.like(f"{name_clean}%")).count()
    driver_login_id = f"{name_clean}{existing_count + 1:02d}"
    
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
    from .models import Driver
    
    driver = Driver.query.filter_by(id=driver_id, hospital_id=hospital_id).first_or_404()
    db.session.delete(driver)
    db.session.commit()
    
    return jsonify({"message": "Driver deleted successfully"})

# Booking APIs
@app.route('/api/bookings', methods=['POST'])
def create_booking():
    from .models import Booking, Driver, Hospital, User
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    import json
    
    try:
        verify_jwt_in_request()
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') == 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception as e:
        return jsonify({"error": "Invalid or missing token", "details": str(e)}), 401
    
    try:
        db.create_all()
        
        if Hospital.query.count() == 0:
            from . import seed_sample_hospitals
            seed_sample_hospitals()
        
        data = request.get_json()
        
        hospital = Hospital.query.get(data['hospital_id'])
        if not hospital:
            return jsonify({
                "error": "Hospital not found",
                "message": "Invalid hospital ID"
            }), 400
        
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
    from .models import Booking, Driver
    from datetime import datetime
    
    booking = Booking.query.get_or_404(booking_id)
    
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
    from .models import Booking, Driver, Hospital
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') == 'driver':
            booking = Booking.query.filter_by(id=booking_id, ambulance_id=current_user_id).first()
        else:
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
        "auto_assigned": booking.auto_assigned,
        "is_cancelled": booking.status in ['Cancelled', 'Auto-Cancelled'],
        "cancel_reason": "No ambulance available" if booking.status == 'Auto-Cancelled' else None
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

@app.route('/api/user/ongoing-booking')
def get_user_ongoing_booking():
    from .models import Booking, Driver, Hospital
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') == 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    # Find ongoing booking for user
    ongoing_booking = Booking.query.filter_by(user_id=current_user_id).filter(
        Booking.status.in_(['Pending', 'Assigned', 'On Route', 'Arrived'])
    ).first()
    
    if not ongoing_booking:
        return jsonify({"has_ongoing": False})
    
    result = {
        "has_ongoing": True,
        "booking": {
            "id": ongoing_booking.id,
            "status": ongoing_booking.status,
            "booking_type": ongoing_booking.booking_type,
            "pickup_location": ongoing_booking.pickup_location,
            "requested_at": ongoing_booking.requested_at.isoformat(),
            "is_cancelled": ongoing_booking.status in ['Cancelled', 'Auto-Cancelled']
        }
    }
    
    if ongoing_booking.ambulance_id:
        driver = Driver.query.get(ongoing_booking.ambulance_id)
        if driver:
            result["booking"]["ambulance"] = {
                "driver_name": driver.name,
                "vehicle_number": driver.vehicle_number
            }
    
    return jsonify(result)

@app.route('/api/bookings/<int:booking_id>/cancel', methods=['POST'])
def cancel_booking(booking_id):
    from .models import Booking, Driver
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    from datetime import datetime
    
    try:
        verify_jwt_in_request()
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') == 'driver':
            return jsonify({"error": "Drivers cannot cancel bookings"}), 403
        
        booking = Booking.query.filter_by(id=booking_id, user_id=current_user_id).first()
        if not booking:
            return jsonify({"error": "Booking not found or unauthorized"}), 404
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    if booking.status in ['Completed', 'Cancelled']:
        return jsonify({"error": "Cannot cancel completed or already cancelled booking"}), 400
    
    # Free up the driver if assigned
    if booking.ambulance_id:
        driver = Driver.query.get(booking.ambulance_id)
        if driver:
            driver.status = 'Available'
    
    booking.status = 'Cancelled'
    booking.completed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({"message": "Booking cancelled successfully"})

@app.route('/api/hospital/<int:hospital_id>/bookings/<int:booking_id>/cancel', methods=['POST'])
def hospital_cancel_booking(hospital_id, booking_id):
    from .models import Booking, Driver
    from datetime import datetime
    
    booking = Booking.query.filter_by(id=booking_id, hospital_id=hospital_id).first()
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    
    if booking.status in ['Completed', 'Cancelled']:
        return jsonify({"error": "Cannot cancel completed or already cancelled booking"}), 400
    
    # Free up the driver if assigned
    if booking.ambulance_id:
        driver = Driver.query.get(booking.ambulance_id)
        if driver:
            driver.status = 'Available'
    
    booking.status = 'Cancelled'
    booking.completed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({"message": "Booking cancelled by hospital"})

@app.route('/api/bookings/auto-cancel-expired', methods=['POST'])
def auto_cancel_expired_bookings():
    from .models import Booking
    from datetime import datetime, timedelta
    
    # Auto-assign after 30 seconds, cancel after 2 minutes
    assign_cutoff = datetime.utcnow() - timedelta(seconds=30)
    cancel_cutoff = datetime.utcnow() - timedelta(minutes=2)
    
    # First try to auto-assign pending bookings
    pending_for_assignment = Booking.query.filter(
        Booking.status == 'Pending',
        Booking.requested_at < assign_cutoff
    ).all()
    
    assigned_count = 0
    for booking in pending_for_assignment:
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
            assigned_count += 1
    
    # Then cancel bookings that are still pending after 2 minutes
    expired_bookings = Booking.query.filter(
        Booking.status == 'Pending',
        Booking.requested_at < cancel_cutoff
    ).all()
    
    cancelled_count = 0
    for booking in expired_bookings:
        booking.status = 'Auto-Cancelled'
        booking.completed_at = datetime.utcnow()
        cancelled_count += 1
    
    if assigned_count > 0 or cancelled_count > 0:
        db.session.commit()
    
    return jsonify({
        "message": f"Auto-assigned {assigned_count} bookings, cancelled {cancelled_count} expired bookings",
        "assigned_count": assigned_count,
        "cancelled_count": cancelled_count
    })

# Driver Authentication APIs
@app.route('/driver/login', methods=['POST'])
def driver_login():
    from .models import Driver, Hospital
    from flask_jwt_extended import create_access_token
    from datetime import timedelta
    
    data = request.get_json()
    login_id = data.get('login_id')
    password = data.get('password')
    
    if not login_id or not password:
        return jsonify({"error": "Login ID and password required"}), 400
    
    driver = Driver.query.filter_by(driver_id=login_id, password=password).first()
    
    if driver:
        hospital = Hospital.query.get(driver.hospital_id)
        
        access_token = create_access_token(
            identity=str(driver.id),
            expires_delta=timedelta(days=30),
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

@app.route('/api/auth/driver/login', methods=['POST'])
def driver_phone_login():
    from .models import Driver
    from .otp_routes import send_otp_helper
    
    data = request.get_json()
    phone_number = data.get('phone_number')
    
    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400
    
    # Check if driver exists with this phone number
    driver = Driver.query.filter_by(phone_number=phone_number).first()
    if not driver:
        return jsonify({'error': 'Driver not found with this phone number'}), 404
    
    # Send OTP for login
    otp_data, otp_status = send_otp_helper(phone_number)
    if otp_status != 200:
        return jsonify(otp_data), otp_status
    
    return jsonify({'message': 'OTP sent for driver login verification'}), 200

@app.route('/api/auth/driver/login/verify', methods=['POST'])
def driver_phone_login_verify():
    from .models import Driver, Hospital
    from .otp_routes import verify_otp_helper
    from flask_jwt_extended import create_access_token
    from datetime import timedelta
    
    data = request.get_json()
    phone_number = data.get('phone_number')
    otp = data.get('otp')
    
    if not phone_number or not otp:
        return jsonify({'error': 'Phone number and OTP are required'}), 400
    
    # Verify OTP
    verify_data, verify_status = verify_otp_helper(phone_number, otp)
    if verify_status != 200:
        return jsonify(verify_data), verify_status
    
    # Get driver
    driver = Driver.query.filter_by(phone_number=phone_number).first()
    if not driver:
        return jsonify({'error': 'Driver not found'}), 404
    
    hospital = Hospital.query.get(driver.hospital_id)
    
    # Generate JWT token
    access_token = create_access_token(
        identity=str(driver.id),
        expires_delta=timedelta(days=30),
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
    }), 200

@app.route('/driver/location', methods=['POST'])
def update_driver_location():
    from .models import Driver
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    
    try:
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
    from .models import Booking, Hospital
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        current_driver_id = int(get_jwt_identity())
        claims = get_jwt()
        
        if claims.get('user_type') != 'driver':
            return jsonify({"error": "Invalid token type"}), 403
            
    except Exception:
        return jsonify({"error": "Invalid or missing token"}), 401
    
    bookings = Booking.query.filter_by(ambulance_id=current_driver_id).filter(
        Booking.status.in_(['Assigned', 'On Route', 'Arrived'])
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
        if booking.ambulance_id:
            driver = Driver.query.get(booking.ambulance_id)
            if driver:
                driver.status = 'Available'
    
    db.session.commit()
    
    return jsonify({"message": "Booking status updated successfully"})

@app.route('/driver/availability', methods=['POST'])
def set_driver_availability():
    from .models import Driver
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    
    try:
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
    from .models import User
    from flask_jwt_extended import get_jwt_identity, get_jwt, verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        current_user_id = int(get_jwt_identity())
        claims = get_jwt()
        
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

# Hospital and Driver routes
@app.route('/api/hospitals')
def get_hospitals():
    from .models import Hospital
    hospitals = Hospital.query.all()
    return jsonify([{
        "id": h.id,
        "name": h.name,
        "address": h.address,
        "contact_number": h.contact_number,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "type": h.type,
        "emergency_services": h.emergency_services,
        "ambulance_count": h.ambulance_count
    } for h in hospitals])

@app.route('/api/hospitals/nearby')
def get_nearby_hospitals():
    from .models import Hospital
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius', 10, type=float)
    
    if not lat or not lng:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    hospitals = Hospital.query.all()
    nearby = []
    
    for h in hospitals:
        # Simple distance calculation (not accurate but works for demo)
        distance = ((h.latitude - lat) ** 2 + (h.longitude - lng) ** 2) ** 0.5 * 111
        if distance <= radius:
            nearby.append({
                "id": h.id,
                "name": h.name,
                "address": h.address,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "type": h.type,
                "emergency_services": h.emergency_services,
                "distance": str(round(distance, 2)),
                "contact_number": h.contact_number
            })
    
    # Sort by distance
    nearby.sort(key=lambda x: float(x['distance']))
    
    return jsonify({
        "hospitals": nearby,
        "total": len(nearby),
        "search_params": {
            "latitude": lat,
            "longitude": lng,
            "radius_km": radius
        }
    })

@app.route('/api/hospitals/seed', methods=['POST'])
def seed_hospitals():
    from . import seed_sample_hospitals
    try:
        seed_sample_hospitals()
        return jsonify({"message": "Hospitals seeded successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/drivers')
def get_all_drivers():
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

# Root endpoint with API documentation
@app.route('/')
def api_list():
    try:
        from .models import Hospital, Driver, Booking
        hospital_count = Hospital.query.count()
        driver_count = Driver.query.count()
        booking_count = Booking.query.count()
    except Exception as e:
        hospital_count = 0
        driver_count = 0
        booking_count = 0
        
    return {
        "message": "Ambulance Booking API - All Routes",
        "statistics": {
            "total_hospitals": hospital_count,
            "total_drivers": driver_count,
            "total_bookings": booking_count
        },
        "endpoints": {
            "Health & System": {
                "GET /api/health": "Check server and database status",
                "POST /api/clear-bookings": "Clear all bookings and reset drivers"
            },
            "Hospital Management": {
                "GET /api/hospitals": "Get all hospitals",
                "GET /api/hospitals/nearby": "Get nearby hospitals (params: lat, lng, radius)",
                "POST /api/hospitals/seed": "Seed sample hospitals",
                "POST /api/hospital/login": "Hospital dashboard login",
                "GET /api/hospital/<id>/dashboard": "Hospital dashboard data",
                "POST /api/hospital/<id>/drivers": "Add new driver",
                "PUT /api/hospital/<id>/drivers/<driver_id>": "Update driver",
                "DELETE /api/hospital/<id>/drivers/<driver_id>": "Delete driver"
            },
            "User Authentication": {
                "POST /api/auth/signup": "Send OTP for user signup",
                "POST /api/auth/signup/verify": "Verify OTP and create user",
                "POST /api/auth/login": "Send OTP for user login",
                "POST /api/auth/login/verify": "Verify OTP and authenticate user",
                "PUT /api/auth/profile": "Update user profile",
                "GET /api/users/<id>": "Get user details"
            },
            "Driver Authentication": {
                "POST /driver/login": "Driver login with login_id/password",
                "POST /api/auth/driver/login": "Send OTP for driver phone login",
                "POST /api/auth/driver/login/verify": "Verify OTP and authenticate driver",
                "POST /driver/location": "Update driver location",
                "POST /driver/availability": "Set driver availability",
                "GET /driver/bookings": "Get driver's assigned bookings"
            },
            "Booking Management": {
                "POST /api/bookings": "Create new booking (JWT required)",
                "GET /api/bookings/<id>/status": "Get booking status (JWT required)",
                "POST /api/bookings/<id>/assign": "Manually assign ambulance",
                "POST /api/bookings/<id>/auto-assign": "Auto-assign available ambulance",
                "POST /api/bookings/<id>/cancel": "Cancel booking (user)",
                "POST /api/hospital/<id>/bookings/<id>/cancel": "Cancel booking (hospital)",
                "GET /api/user/ongoing-booking": "Check user's ongoing booking",
                "POST /booking/status": "Update booking status"
            },
            "OTP System": {
                "POST /send-otp": "Send OTP to phone number",
                "POST /verify-otp": "Verify OTP code"
            },
            "WebRTC Signaling": {
                "POST /webrtc/offer": "WebRTC offer signaling",
                "POST /webrtc/candidate": "WebRTC candidate signaling",
                "POST /webrtc/leave": "Leave WebRTC room"
            },
            "Dashboard Pages": {
                "GET /dashboard": "Hospital dashboard page",
                "GET /dashboard/login": "Hospital login page",
                "GET /webrtc-dashboard": "WebRTC hospital dashboard"
            },
            "Driver Routes": {
                "GET /api/drivers": "Get all drivers from all hospitals"
            }
        },
        "authentication": {
            "JWT_Required": [
                "/api/bookings (POST)",
                "/api/bookings/<id>/status (GET)",
                "/api/auth/profile (PUT)",
                "/api/users/<id> (GET)",
                "/driver/location (POST)",
                "/driver/availability (POST)",
                "/driver/bookings (GET)"
            ],
            "No_Auth_Required": [
                "All /api/hospitals routes",
                "All /api/auth/login and /api/auth/signup routes",
                "All OTP routes",
                "All dashboard pages",
                "Health and system routes"
            ]
        },
        "notes": {
            "OTP": "Fixed OTP is '1234' for all phone numbers",
            "JWT": "Tokens expire in 30 days",
            "Phone_Format": "Accepts international formats, cleaned automatically",
            "Driver_Login": "Supports both login_id/password and phone/OTP methods",
            "WebRTC": "Uses PeerPyRTC for real-time communication"
        }
    }

if __name__ == '__main__':
    start_scheduler()
    app.run(debug=True)