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
    
    drivers = db.relationship('Driver', back_populates='hospital', lazy='dynamic')

class Driver(db.Model, TimestampMixin):
    __tablename__ = 'drivers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(32), nullable=False)
    vehicle_number = db.Column(db.String(32), unique=True, nullable=False)
    status = db.Column(db.String(20), default='Available', nullable=False)  # Available/Busy/Offline
    current_location = db.Column(db.String(255), nullable=True)  # Coordinates
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False)
    
    hospital = db.relationship('Hospital', back_populates='drivers')
    bookings = db.relationship('Booking', back_populates='ambulance', lazy='dynamic')

class Booking(db.Model, TimestampMixin):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ambulance_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)
    pickup_location = db.Column(db.Text, nullable=False)
    destination = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='Pending', nullable=False)  # Pending/Accepted/On Route/Completed/Cancelled
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    user = db.relationship('User', back_populates='bookings')
    ambulance = db.relationship('Driver', back_populates='bookings')
