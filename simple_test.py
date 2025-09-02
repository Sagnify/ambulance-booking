#!/usr/bin/env python3
"""
Simple test script to verify the ambulance booking system
"""

import requests
import json

# API Base URL
API_BASE_URL = 'https://ambulance-backend-iota.vercel.app'

def test_api():
    print("Testing Ambulance Booking API...")
    
    # Test 1: Seed hospitals
    print("\n1. Seeding hospitals...")
    try:
        response = requests.post(f'{API_BASE_URL}/api/hospitals/seed')
        print(f"   Status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"   Added {data.get('hospitals_added', 0)} hospitals")
            print(f"   Added {data.get('drivers_added', 0)} drivers")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Get hospitals
    print("\n2. Getting hospitals...")
    try:
        response = requests.get(f'{API_BASE_URL}/api/hospitals')
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            hospitals = data.get('hospitals', [])
            print(f"   Found {len(hospitals)} hospitals")
            if hospitals:
                hospital_id = hospitals[0]['id']
                print(f"   First hospital: {hospitals[0]['name']} (ID: {hospital_id})")
                
                # Test 3: Create booking
                print(f"\n3. Creating booking for hospital {hospital_id}...")
                booking_data = {
                    "hospital_id": hospital_id,
                    "pickup_location": "Baghajatin, Kolkata",
                    "destination": hospitals[0]['name'],
                    "booking_type": "Emergency",
                    "emergency_type": "Heart Attack",
                    "severity": "Critical",
                    "patient_name": "Test Patient",
                    "patient_phone": "+91-9876543210"
                }
                
                try:
                    response = requests.post(f'{API_BASE_URL}/api/bookings', 
                                           headers={'Content-Type': 'application/json'},
                                           json=booking_data)
                    print(f"   Status: {response.status_code}")
                    if response.status_code == 200:
                        booking_result = response.json()
                        booking_id = booking_result.get('booking_id')
                        print(f"   Created booking ID: {booking_id}")
                        
                        # Test 4: Check hospital dashboard
                        print(f"\n4. Checking hospital dashboard...")
                        try:
                            response = requests.get(f'{API_BASE_URL}/api/hospital/{hospital_id}/dashboard')
                            print(f"   Status: {response.status_code}")
                            if response.status_code == 200:
                                dashboard = response.json()
                                pending = dashboard.get('pending_bookings', [])
                                print(f"   Pending bookings: {len(pending)}")
                                if pending:
                                    print(f"   First booking type: {pending[0].get('booking_type')}")
                        except Exception as e:
                            print(f"   Dashboard error: {e}")
                        
                        # Test 5: Auto-assign ambulance
                        print(f"\n5. Auto-assigning ambulance...")
                        try:
                            response = requests.post(f'{API_BASE_URL}/api/bookings/{booking_id}/auto-assign',
                                                   headers={'Content-Type': 'application/json'},
                                                   json={})
                            print(f"   Status: {response.status_code}")
                            if response.status_code == 200:
                                assign_result = response.json()
                                print(f"   Assignment result: {assign_result.get('message')}")
                            else:
                                print(f"   Error response: {response.text}")
                        except Exception as e:
                            print(f"   Auto-assign error: {e}")
                    else:
                        print(f"   Booking error: {response.text}")
                except Exception as e:
                    print(f"   Booking creation error: {e}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\nTest completed!")

if __name__ == "__main__":
    test_api()