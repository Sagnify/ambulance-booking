#!/usr/bin/env python3
from api import create_app
from api.extensions import db
from sqlalchemy import text
import re

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        # Add new columns
        conn.execute(text("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_id VARCHAR(50) UNIQUE"))
        conn.execute(text("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT 'driver123'"))
        
        # Update existing drivers with login credentials
        drivers = conn.execute(text("SELECT id, name FROM drivers WHERE driver_id IS NULL")).fetchall()
        
        for driver in drivers:
            driver_id, name = driver
            # Generate login ID from name
            name_clean = re.sub(r'[^a-zA-Z]', '', name).lower()
            existing_count = conn.execute(text(f"SELECT COUNT(*) FROM drivers WHERE driver_id LIKE '{name_clean}%'")).scalar()
            login_id = f"{name_clean}{existing_count + 1:02d}"
            
            conn.execute(text(f"UPDATE drivers SET driver_id = '{login_id}', password = 'driver123' WHERE id = {driver_id}"))
        
        conn.commit()
        print(f"Updated {len(drivers)} drivers with login credentials")
        
        # Show all driver credentials
        all_drivers = conn.execute(text("SELECT name, driver_id, password, vehicle_number FROM drivers ORDER BY id")).fetchall()
        
        print("\nDriver Login Credentials:")
        print("Name | Login ID | Password | Vehicle")
        print("-" * 50)
        for driver in all_drivers:
            print(f"{driver[0]:15} | {driver[1]:8} | {driver[2]:8} | {driver[3]}")