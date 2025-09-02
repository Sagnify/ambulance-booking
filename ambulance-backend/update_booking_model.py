#!/usr/bin/env python3
from api import create_app
from api.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        # Add new columns to bookings table
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hospital_id INTEGER"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'Normal'"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS emergency_type VARCHAR(50)"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS severity VARCHAR(20)"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accident_details TEXT"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_name VARCHAR(120)"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(32)"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT FALSE"))
        
        # Update status column to use new values
        conn.execute(text("UPDATE bookings SET status = 'Pending' WHERE status = 'Pending'"))
        
        # Add foreign key constraint for hospital_id
        try:
            conn.execute(text("ALTER TABLE bookings ADD CONSTRAINT fk_bookings_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)"))
        except:
            pass  # Constraint might already exist
        
        conn.commit()
        print("Booking model updated successfully!")
        
        # Show current bookings
        bookings = conn.execute(text("SELECT COUNT(*) FROM bookings")).scalar()
        print(f"Total bookings in database: {bookings}")