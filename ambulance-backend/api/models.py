from datetime import datetime
from .extensions import db

class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class User(db.Model, TimestampMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    phone_number = db.Column(db.String(32), unique=True, nullable=False)
    address = db.Column(db.Text, nullable=True)
    emergency_contacts = db.Column(db.Text, nullable=True)
    
    bookings = db.relationship('Booking', back_populates='user', lazy='dynamic')

class Hospital(db.Model, TimestampMixin):
    __tablename__ = 'hospitals'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text, nullable=True)
    contact_number = db.Column(db.String(32), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    type = db.Column(db.String(50), nullable=True)
    emergency_services = db.Column(db.Boolean, default=True)
    ambulance_count = db.Column(db.Integer, default=0)
    hospital_id = db.Column(db.String(50), unique=True, nullable=True)
    password = db.Column(db.String(255), nullable=True)
    
    drivers = db.relationship('Driver', back_populates='hospital', lazy='dynamic')

class Driver(db.Model, TimestampMixin):
    __tablename__ = 'drivers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(32), nullable=False)
    license_number = db.Column(db.String(32), unique=True, nullable=False)
    vehicle_number = db.Column(db.String(32), unique=True, nullable=False)
    status = db.Column(db.String(20), default='Available', nullable=False)  # Available/Busy/Offline
    current_latitude = db.Column(db.Float, nullable=True)
    current_longitude = db.Column(db.Float, nullable=True)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False)
    driver_id = db.Column(db.String(50), unique=True, nullable=True)  # Auto-generated login ID
    password = db.Column(db.String(255), default='driver123', nullable=True)  # Default password
    
    hospital = db.relationship('Hospital', back_populates='drivers')
    bookings = db.relationship('Booking', back_populates='ambulance', lazy='dynamic')

class Booking(db.Model, TimestampMixin):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False)
    ambulance_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)
    pickup_location = db.Column(db.Text, nullable=False)
    pickup_latitude = db.Column(db.Float, nullable=True)
    pickup_longitude = db.Column(db.Float, nullable=True)
    destination = db.Column(db.Text, nullable=True)
    booking_type = db.Column(db.String(20), nullable=False)  # Emergency/Accident/Normal
    emergency_type = db.Column(db.String(50), nullable=True)  # Heart Attack, Stroke, etc.
    severity = db.Column(db.String(20), nullable=True)  # Critical/High/Medium/Low
    accident_details = db.Column(db.Text, nullable=True)  # JSON string for accident info
    patient_name = db.Column(db.String(120), nullable=True)
    patient_phone = db.Column(db.String(32), nullable=True)
    status = db.Column(db.String(20), default='Pending', nullable=False)  # Pending/Assigned/On Route/Completed/Cancelled
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    assigned_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    auto_assigned = db.Column(db.Boolean, default=False, nullable=False)
    
    user = db.relationship('User', back_populates='bookings')
    hospital = db.relationship('Hospital')
    ambulance = db.relationship('Driver', back_populates='bookings')
