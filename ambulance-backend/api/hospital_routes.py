from flask import Blueprint, jsonify, request
from .models import Hospital, db
from sqlalchemy import func

hospital_bp = Blueprint('hospital', __name__)

@hospital_bp.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    """Get list of all hospitals"""
    try:
        hospitals = Hospital.query.all()
        hospital_list = [
            {
                'id': hospital.id,
                'name': hospital.name,
                'address': hospital.address,
                'phone': hospital.contact_number,
                'latitude': float(hospital.latitude) if hospital.latitude else None,
                'longitude': float(hospital.longitude) if hospital.longitude else None,
                'type': hospital.type,
                'emergency_services': hospital.emergency_services,
                'ambulance_count': hospital.ambulance_count,
                'created_at': hospital.created_at.isoformat() if hospital.created_at else None
            }
            for hospital in hospitals
        ]
        
        return jsonify({
            'success': True,
            'hospitals': hospital_list,
            'total': len(hospital_list)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching hospitals: {str(e)}'
        }), 500

@hospital_bp.route('/api/hospitals/seed', methods=['POST'])
def seed_hospitals():
    """Populate database with sample Kolkata hospitals"""
    try:
        # Clear existing hospitals
        Hospital.query.delete()
        
        # Sample hospitals data for Kolkata (near Baghajatin)
        hospitals_data = [
            {
                'name': 'SSKM Hospital',
                'address': '244, AJC Bose Road, Kolkata, West Bengal 700020',
                'contact_number': '+91-33-2223-3526',
                'latitude': 22.5448,
                'longitude': 88.3426,
                'type': 'government',
                'emergency_services': True,
                'ambulance_count': 12
            },
            {
                'name': 'Apollo Gleneagles Hospital',
                'address': '58, Canal Circular Road, Kolkata, West Bengal 700054',
                'contact_number': '+91-33-2320-3040',
                'latitude': 22.5205,
                'longitude': 88.3732,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 8
            },
            {
                'name': 'Ruby General Hospital',
                'address': '16/2, Alipore Road, Kolkata, West Bengal 700027',
                'contact_number': '+91-33-3987-4444',
                'latitude': 22.5355,
                'longitude': 88.3267,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 6
            },
            {
                'name': 'Baghajatin State General Hospital',
                'address': 'VIP Road, Baghajatin, Kolkata, West Bengal 700086',
                'contact_number': '+91-33-2441-5678',
                'latitude': 22.4675,
                'longitude': 88.3732,
                'type': 'government',
                'emergency_services': True,
                'ambulance_count': 5
            },
            {
                'name': 'Fortis Hospital Anandapur',
                'address': '730, Anandapur, EM Bypass, Kolkata, West Bengal 700107',
                'contact_number': '+91-33-6628-4444',
                'latitude': 22.5126,
                'longitude': 88.3959,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 10
            },
            {
                'name': 'Medica Superspecialty Hospital',
                'address': '127, Mukundapur, EM Bypass, Kolkata, West Bengal 700099',
                'contact_number': '+91-33-6652-0000',
                'latitude': 22.5026,
                'longitude': 88.3959,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 7
            },
            {
                'name': 'Desun Hospital',
                'address': 'Desun More, Kasba Golpark, EM Bypass, Kolkata, West Bengal 700107',
                'contact_number': '+91-33-6628-8888',
                'latitude': 22.5089,
                'longitude': 88.3876,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 4
            },
            {
                'name': 'Charnock Hospital',
                'address': 'Teghoria, New Town, Kolkata, West Bengal 700157',
                'contact_number': '+91-33-6606-5000',
                'latitude': 22.5889,
                'longitude': 88.4692,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 6
            }
        ]
        
        # Add hospitals to database
        for hospital_data in hospitals_data:
            hospital = Hospital(**hospital_data)
            db.session.add(hospital)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully added {len(hospitals_data)} Kolkata hospitals to database',
            'hospitals_added': len(hospitals_data)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error seeding hospitals: {str(e)}'
        }), 500

@hospital_bp.route('/api/hospitals/nearby', methods=['GET'])
def get_nearby_hospitals():
    """Get hospitals within specified radius of coordinates"""
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', default=5, type=float)
        
        if not lat or not lng:
            return jsonify({
                'success': False,
                'message': 'Latitude and longitude are required'
            }), 400
        
        # Simple distance calculation (for production, use PostGIS or similar)
        hospitals = Hospital.query.filter(
            Hospital.latitude.isnot(None),
            Hospital.longitude.isnot(None)
        ).all()
        
        nearby_hospitals = []
        for hospital in hospitals:
            # Calculate approximate distance (simplified)
            lat_diff = abs(float(hospital.latitude) - lat)
            lng_diff = abs(float(hospital.longitude) - lng)
            distance = (lat_diff + lng_diff) * 111  # Rough km conversion
            
            if distance <= radius:
                nearby_hospitals.append({
                    'id': hospital.id,
                    'name': hospital.name,
                    'address': hospital.address,
                    'phone': hospital.contact_number,
                    'latitude': float(hospital.latitude),
                    'longitude': float(hospital.longitude),
                    'type': hospital.type,
                    'emergency_services': hospital.emergency_services,
                    'distance': round(distance, 1)
                })
        
        # Sort by distance
        nearby_hospitals.sort(key=lambda x: x['distance'])
        
        return jsonify({
            'success': True,
            'hospitals': nearby_hospitals,
            'total': len(nearby_hospitals)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching nearby hospitals: {str(e)}'
        }), 500