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

# Create app via factory
app = create_app()
CORS(app)

# Hospital Dashboard Routes
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/dashboard/login')
def dashboard_login():
    return render_template('login.html')

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

# Booking Routes
@app.route('/api/bookings', methods=['POST'])
def create_new_booking():
    from flask import request, jsonify
    from .models import Booking
    import json
    
    data = request.get_json()
    
    booking = Booking(
        hospital_id=data['hospital_id'],
        pickup_location=data['pickup_location'],
        destination=data.get('destination'),
        booking_type=data['booking_type'],
        emergency_type=data.get('emergency_type'),
        severity=data.get('severity'),
        accident_details=json.dumps(data.get('accident_details', {})) if data.get('accident_details') else None,
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

@app.route('/api/bookings/<int:booking_id>/auto-assign', methods=['POST'])
def auto_assign_driver(booking_id):
    from flask import jsonify
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
                "driver_name": available_driver.name,
                "driver_phone": available_driver.phone_number,
                "vehicle_number": available_driver.vehicle_number
            }
        })
    
    return jsonify({"message": "No available ambulance"}), 404

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
            "vehicle": d.vehicle_number,
            "status": d.status,
            "location": d.current_location,
            "login_id": d.driver_id,
            "password": d.password
        } for d in drivers],
        "pending_bookings": [{
            "id": b.id,
            "booking_type": b.booking_type,
            "emergency_type": b.emergency_type,
            "severity": b.severity,
            "pickup_location": b.pickup_location,
            "patient_name": b.patient_name,
            "patient_phone": b.patient_phone,
            "requested_at": b.requested_at.isoformat(),
            "time_remaining": max(0, 30 - int((datetime.utcnow() - b.requested_at).total_seconds()))
        } for b in Booking.query.filter_by(hospital_id=hospital_id, status='Pending').all()]
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
    from .models import Booking, Driver
    import json
    
    data = request.get_json()
    
    booking = Booking(
        hospital_id=data['hospital_id'],
        pickup_location=data['pickup_location'],
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
    
    booking = Booking.query.get_or_404(booking_id)
    
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

# Run directly
if __name__ == '__main__':
    app.run(debug=True)
