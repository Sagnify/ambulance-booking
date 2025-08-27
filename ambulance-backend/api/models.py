# app/models.py
from datetime import datetime
from sqlalchemy import CheckConstraint
from sqlalchemy.orm import validates
from .extensions import db, bcrypt

class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class Hospital(db.Model, TimestampMixin):
    __tablename__ = 'hospitals'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    address = db.Column(db.String(500), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    state = db.Column(db.String(120), nullable=True)
    pincode = db.Column(db.String(20), nullable=True)

    # Relationship to drivers (one hospital, many drivers)
    drivers = db.relationship('AmbulanceDriver', back_populates='hospital', lazy='dynamic')

class Organization(db.Model, TimestampMixin):
    __tablename__ = 'organizations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    contact_email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(32), nullable=True)

    # Relationship to drivers (one org, many drivers)
    drivers = db.relationship('AmbulanceDriver', back_populates='organization', lazy='dynamic')

class AmbulanceDriver(db.Model, TimestampMixin):
    __tablename__ = 'ambulance_drivers'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    license_number = db.Column(db.String(64), unique=True, nullable=False)
    vehicle_number = db.Column(db.String(32), unique=True, nullable=False)

    # Foreign keys to either hospital OR organization (one must be present)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)

    user = db.relationship('User', back_populates='driver_profile')
    hospital = db.relationship('Hospital', back_populates='drivers')
    organization = db.relationship('Organization', back_populates='drivers')

    # DB-level constraint: exactly one of hospital_id or organization_id must be non-null
    __table_args__ = (
        CheckConstraint(
            "(hospital_id IS NOT NULL AND organization_id IS NULL) "
            "OR (hospital_id IS NULL AND organization_id IS NOT NULL)",
            name="ck_driver_one_affiliation_only"
        ),
    )

    @validates('hospital_id', 'organization_id')
    def _validate_affiliation(self, key, value):
        """
        Basic application-level validation: prevent both being set and
        ensure at least one is present on insert.
        Note: SQL-level CheckConstraint is the final authority.
        """
        # We can't fully validate presence of the other field here because
        # SQLAlchemy may set fields in any order; but we can catch the obvious case.
        if key == 'hospital_id' and value is not None:
            # if organization_id already set on this instance, reject
            if getattr(self, 'organization_id', None) is not None:
                raise ValueError("AmbulanceDriver cannot be linked to both a hospital and an organization.")
        if key == 'organization_id' and value is not None:
            if getattr(self, 'hospital_id', None) is not None:
                raise ValueError("AmbulanceDriver cannot be linked to both a hospital and an organization.")
        return value

    # Optionally, helper property
    @property
    def affiliation(self):
        if self.hospital:
            return {"type": "hospital", "id": self.hospital.id, "name": self.hospital.name}
        if self.organization:
            return {"type": "organization", "id": self.organization.id, "name": self.organization.name}
        return None

# Make sure User has the back relationship defined (example)
class User(db.Model, TimestampMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    phone = db.Column(db.String(32), unique=True, nullable=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(32), nullable=False, default='user')  # user | driver | admin

    driver_profile = db.relationship("AmbulanceDriver", uselist=False, back_populates="user")
