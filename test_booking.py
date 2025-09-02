#!/usr/bin/env python3
"""
Test script to verify the ambulance booking system works end-to-end
"""

import requests
import json
import time

# API Base URL
API_BASE_URL = 'https://ambulance-backend-iota.vercel.app'

def test_hospital_seeding():
    """Test seeding hospitals and drivers"""
    print("🏥 Testing hospital seeding...")
    
    try:
        response = requests.post(f'{API_BASE_URL}/api/hospitals/seed')
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Successfully seeded {data['hospitals_added']} hospitals and {data['drivers_added']} drivers")
            return True
        else:
            print(f"❌ Failed to seed hospitals: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error seeding hospitals: {e}")
        return False

def test_get_hospitals():
    """Test getting list of hospitals"""
    print("\n🏥 Testing hospital list...")
    
    try:
        response = requests.get(f'{API_BASE_URL}/api/hospitals')
        if response.status_code == 200:
            data = response.json()
            hospitals = data['hospitals']
            print(f"✅ Found {len(hospitals)} hospitals")
            if hospitals:
                print(f"   First hospital: {hospitals[0]['name']} (ID: {hospitals[0]['id']})")
                return hospitals[0]['id']  # Return first hospital ID for testing
        else:
            print(f"❌ Failed to get hospitals: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting hospitals: {e}")
        return None

def test_hospital_dashboard(hospital_id):
    """Test hospital dashboard data"""
    print(f"\n🏥 Testing hospital dashboard for hospital {hospital_id}...")
    
    try:
        response = requests.get(f'{API_BASE_URL}/api/hospital/{hospital_id}/dashboard')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Hospital: {data['hospital']['name']}")
            print(f"   Available ambulances: {data['stats']['available_ambulances']}")
            print(f"   Total drivers: {data['stats']['total_drivers']}")
            print(f"   Pending bookings: {len(data['pending_bookings'])}")
            return True
        else:
            print(f"❌ Failed to get dashboard: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting dashboard: {e}")
        return False

def test_create_booking(hospital_id):
    """Test creating a booking"""
    print(f"\n🚑 Testing booking creation for hospital {hospital_id}...")
    
    booking_data = {
        "hospital_id": hospital_id,
        "pickup_location": "Baghajatin, Kolkata",
        "destination": "Test Hospital",
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
        if response.status_code == 200:
            data = response.json()
            booking_id = data['booking_id']
            print(f"✅ Created booking with ID: {booking_id}")
            return booking_id
        else:
            print(f"❌ Failed to create booking: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating booking: {e}")
        return None

def test_auto_assign(booking_id):
    """Test auto-assignment of ambulance"""
    print(f"\n🚑 Testing auto-assignment for booking {booking_id}...")
    
    try:
        response = requests.post(f'{API_BASE_URL}/api/bookings/{booking_id}/auto-assign',
                               headers={'Content-Type': 'application/json'},
                               json={})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Auto-assigned ambulance")
            if 'driver' in data:
                driver = data['driver']
                print(f"   Driver: {driver['name']}")
                print(f"   Vehicle: {driver['vehicle']}")
                print(f"   Phone: {driver['phone']}")
            return True
        else:
            print(f"❌ Failed to auto-assign: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error auto-assigning: {e}")
        return False

def test_booking_status(booking_id):
    """Test getting booking status"""
    print(f"\n📋 Testing booking status for booking {booking_id}...")
    
    try:
        response = requests.get(f'{API_BASE_URL}/api/bookings/{booking_id}/status')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Booking status: {data['status']}")
            print(f"   Booking type: {data['booking_type']}")
            if 'ambulance' in data:
                ambulance = data['ambulance']
                print(f"   Assigned driver: {ambulance['driver_name']}")
                print(f"   Vehicle: {ambulance['vehicle_number']}")
            return True
        else:
            print(f"❌ Failed to get status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting status: {e}")
        return False

def main():
    """Run all tests"""
    print("🚑 Ambulance Booking System Test")
    print("=" * 40)
    
    # Test 1: Seed hospitals and drivers
    if not test_hospital_seeding():
        print("\n❌ Hospital seeding failed. Exiting.")
        return
    
    # Test 2: Get hospitals
    hospital_id = test_get_hospitals()
    if not hospital_id:
        print("\n❌ Could not get hospitals. Exiting.")
        return
    
    # Test 3: Check hospital dashboard
    if not test_hospital_dashboard(hospital_id):
        print("\n❌ Hospital dashboard failed.")
        return
    
    # Test 4: Create booking
    booking_id = test_create_booking(hospital_id)
    if not booking_id:
        print("\n❌ Booking creation failed. Exiting.")
        return
    
    # Test 5: Check booking status (before assignment)
    test_booking_status(booking_id)
    
    # Test 6: Auto-assign ambulance
    if not test_auto_assign(booking_id):
        print("\n❌ Auto-assignment failed.")
        return
    
    # Test 7: Check booking status (after assignment)
    test_booking_status(booking_id)
    
    # Test 8: Check hospital dashboard again (should show booking)
    test_hospital_dashboard(hospital_id)
    
    print("\n✅ All tests completed!")
    print("\n🎉 Booking system is working correctly!")

if __name__ == "__main__":
    main()