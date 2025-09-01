from api import create_app
from api.models import db, Hospital

def seed_hospitals():
    app = create_app()
    
    with app.app_context():
        # Clear existing hospitals
        Hospital.query.delete()
        
        # Sample hospitals data for Kolkata (near Baghajatin)
        hospitals_data = [
            {
                'name': 'SSKM Hospital',
                'address': '244, AJC Bose Road, Kolkata, West Bengal 700020',
                'phone': '+91-33-2223-3526',
                'latitude': 22.5448,
                'longitude': 88.3426,
                'type': 'government',
                'emergency_services': True,
                'ambulance_count': 12
            },
            {
                'name': 'Apollo Gleneagles Hospital',
                'address': '58, Canal Circular Road, Kolkata, West Bengal 700054',
                'phone': '+91-33-2320-3040',
                'latitude': 22.5205,
                'longitude': 88.3732,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 8
            },
            {
                'name': 'Ruby General Hospital',
                'address': '16/2, Alipore Road, Kolkata, West Bengal 700027',
                'phone': '+91-33-3987-4444',
                'latitude': 22.5355,
                'longitude': 88.3267,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 6
            },
            {
                'name': 'Baghajatin State General Hospital',
                'address': 'VIP Road, Baghajatin, Kolkata, West Bengal 700086',
                'phone': '+91-33-2441-5678',
                'latitude': 22.4675,
                'longitude': 88.3732,
                'type': 'government',
                'emergency_services': True,
                'ambulance_count': 5
            },
            {
                'name': 'Fortis Hospital Anandapur',
                'address': '730, Anandapur, EM Bypass, Kolkata, West Bengal 700107',
                'phone': '+91-33-6628-4444',
                'latitude': 22.5126,
                'longitude': 88.3959,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 10
            },
            {
                'name': 'Medica Superspecialty Hospital',
                'address': '127, Mukundapur, EM Bypass, Kolkata, West Bengal 700099',
                'phone': '+91-33-6652-0000',
                'latitude': 22.5026,
                'longitude': 88.3959,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 7
            },
            {
                'name': 'Desun Hospital',
                'address': 'Desun More, Kasba Golpark, EM Bypass, Kolkata, West Bengal 700107',
                'phone': '+91-33-6628-8888',
                'latitude': 22.5089,
                'longitude': 88.3876,
                'type': 'private',
                'emergency_services': True,
                'ambulance_count': 4
            },
            {
                'name': 'Charnock Hospital',
                'address': 'Teghoria, New Town, Kolkata, West Bengal 700157',
                'phone': '+91-33-6606-5000',
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
        print(f"Successfully added {len(hospitals_data)} hospitals to the database!")

if __name__ == '__main__':
    seed_hospitals()