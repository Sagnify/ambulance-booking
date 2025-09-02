#!/usr/bin/env python3
from api import create_app
from api.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        # Add columns if they don't exist
        conn.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(50)"))
        conn.execute(text("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS password VARCHAR(255)"))
        
        # Update existing hospitals
        result = conn.execute(text("""
            UPDATE hospitals SET 
                hospital_id = 'H' || LPAD(id::text, 3, '0'),
                password = 'admin'
            WHERE hospital_id IS NULL OR hospital_id = ''
        """))
        
        conn.commit()
        print(f"Updated hospitals with login credentials")
        
        # Show all hospital credentials
        hospitals = conn.execute(text("SELECT hospital_id, name FROM hospitals WHERE hospital_id IS NOT NULL ORDER BY hospital_id"))
        
        print("\nHospital Login Credentials:")
        print("Hospital ID | Password | Hospital Name")
        print("-" * 60)
        for row in hospitals:
            print(f"{row[0]:11} | admin    | {row[1]}")