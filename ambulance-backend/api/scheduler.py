import threading
import time
from datetime import datetime, timedelta
from .extensions import db
from .models import Booking

def auto_assign_and_cancel_bookings():
    """Background task to auto-assign after 30 seconds and cancel after 2 minutes"""
    while True:
        try:
            with db.session.begin():
                from .models import Driver
                
                # Auto-assign bookings after 30 seconds
                assign_cutoff = datetime.utcnow() - timedelta(seconds=30)
                pending_bookings = Booking.query.filter(
                    Booking.status == 'Pending',
                    Booking.requested_at < assign_cutoff
                ).all()
                
                for booking in pending_bookings:
                    available_driver = Driver.query.filter_by(
                        hospital_id=booking.hospital_id,
                        status='Available'
                    ).first()
                    
                    if available_driver:
                        booking.ambulance_id = available_driver.id
                        booking.status = 'Assigned'
                        booking.assigned_at = datetime.utcnow()
                        booking.auto_assigned = True
                        available_driver.status = 'Busy'
                        print(f"Auto-assigned booking {booking.id} to driver {available_driver.id}")
                
                # Auto-cancel bookings after 2 minutes if still pending
                cancel_cutoff = datetime.utcnow() - timedelta(minutes=2)
                expired_bookings = Booking.query.filter(
                    Booking.status == 'Pending',
                    Booking.requested_at < cancel_cutoff
                ).all()
                
                for booking in expired_bookings:
                    booking.status = 'Auto-Cancelled'
                    booking.completed_at = datetime.utcnow()
                    print(f"Auto-cancelled booking {booking.id} - no driver available")
                
                if pending_bookings or expired_bookings:
                    db.session.commit()
                    if pending_bookings:
                        print(f"Auto-assigned {len([b for b in pending_bookings if b.status == 'Assigned'])} bookings")
                    if expired_bookings:
                        print(f"Auto-cancelled {len(expired_bookings)} expired bookings")
                    
        except Exception as e:
            print(f"Error in auto-cancel task: {e}")
            db.session.rollback()
        
        # Check every 30 seconds
        time.sleep(30)

def start_scheduler():
    """Start the background scheduler"""
    scheduler_thread = threading.Thread(target=auto_assign_and_cancel_bookings, daemon=True)
    scheduler_thread.start()
    print("✅ Auto-assign and cancel scheduler started")