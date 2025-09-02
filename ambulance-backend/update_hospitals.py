#!/usr/bin/env python3
from api import create_app
from api.extensions import db
from api.models import Hospital

app = create_app()

with app.app_context():
    # Add hospital_id and password to existing hospitals
    hospitals = Hospital.query.all()
    
    for i, hospital in enumerate(hospitals, 1):
        if not hospital.hospital_id:
            hospital.hospital_id = f"H{i:03d}"  # H001, H002, etc.
            hospital.password = "admin"
    
    db.session.commit()
    print(f"Updated {len(hospitals)} hospitals with login credentials")
    
    # Print all hospital IDs for reference
    print("\nHospital Login Credentials:")
    print("Hospital ID | Password | Hospital Name")
    print("-" * 50)
    for hospital in hospitals:
        print(f"{hospital.hospital_id:11} | admin    | {hospital.name}")