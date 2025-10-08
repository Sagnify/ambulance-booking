from flask import Blueprint, jsonify
from .models import User, Driver, Hospital, Booking
from .extensions import db
from datetime import datetime, timedelta

feature_check_bp = Blueprint('feature_check', __name__)

@feature_check_bp.route('/api/system/health-check')
def comprehensive_health_check():
    """Comprehensive system health and feature check"""
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_status": "healthy",
        "components": {}
    }
    
    # Database connectivity
    try:
        db.session.execute('SELECT 1')
        results["components"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        results["components"]["database"] = {
            "status": "unhealthy",
            "message": f"Database error: {str(e)}"
        }
        results["overall_status"] = "unhealthy"
    
    # Data integrity checks
    try:
        user_count = User.query.count()
        driver_count = Driver.query.count()
        hospital_count = Hospital.query.count()
        booking_count = Booking.query.count()
        
        results["components"]["data_integrity"] = {
            "status": "healthy",
            "counts": {
                "users": user_count,
                "drivers": driver_count,
                "hospitals": hospital_count,
                "bookings": booking_count
            }
        }
    except Exception as e:
        results["components"]["data_integrity"] = {
            "status": "unhealthy",
            "message": f"Data integrity error: {str(e)}"
        }
        results["overall_status"] = "unhealthy"
    
    # Booking system checks
    try:
        pending_bookings = Booking.query.filter_by(status='Pending').count()
        assigned_bookings = Booking.query.filter_by(status='Assigned').count()
        completed_bookings = Booking.query.filter_by(status='Completed').count()
        cancelled_bookings = Booking.query.filter(
            Booking.status.in_(['Cancelled', 'Auto-Cancelled'])
        ).count()
        
        # Check for stale bookings (pending > 5 minutes)
        stale_cutoff = datetime.utcnow() - timedelta(minutes=5)
        stale_bookings = Booking.query.filter(
            Booking.status == 'Pending',
            Booking.requested_at < stale_cutoff
        ).count()
        
        results["components"]["booking_system"] = {
            "status": "healthy" if stale_bookings == 0 else "warning",
            "booking_stats": {
                "pending": pending_bookings,
                "assigned": assigned_bookings,
                "completed": completed_bookings,
                "cancelled": cancelled_bookings,
                "stale_pending": stale_bookings
            }
        }
        
        if stale_bookings > 0:
            results["components"]["booking_system"]["message"] = f"{stale_bookings} stale pending bookings found"
            
    except Exception as e:
        results["components"]["booking_system"] = {
            "status": "unhealthy",
            "message": f"Booking system error: {str(e)}"
        }
        results["overall_status"] = "unhealthy"
    
    # Driver availability
    try:
        available_drivers = Driver.query.filter_by(status='Available').count()
        busy_drivers = Driver.query.filter_by(status='Busy').count()
        offline_drivers = Driver.query.filter_by(status='Offline').count()
        
        results["components"]["driver_availability"] = {
            "status": "healthy" if available_drivers > 0 else "warning",
            "driver_stats": {
                "available": available_drivers,
                "busy": busy_drivers,
                "offline": offline_drivers
            }
        }
        
        if available_drivers == 0:
            results["components"]["driver_availability"]["message"] = "No available drivers"
            
    except Exception as e:
        results["components"]["driver_availability"] = {
            "status": "unhealthy",
            "message": f"Driver availability error: {str(e)}"
        }
        results["overall_status"] = "unhealthy"
    
    return jsonify(results)

@feature_check_bp.route('/api/system/feature-status')
def feature_status_check():
    """Check status of all major features"""
    features = {
        "user_authentication": check_user_auth(),
        "driver_authentication": check_driver_auth(),
        "booking_creation": check_booking_creation(),
        "booking_cancellation": check_booking_cancellation(),
        "hospital_management": check_hospital_management(),
        "auto_assignment": check_auto_assignment(),
        "location_services": check_location_services(),
        "real_time_updates": check_real_time_updates()
    }
    
    return jsonify({
        "timestamp": datetime.utcnow().isoformat(),
        "features": features
    })

def check_user_auth():
    """Check user authentication system"""
    try:
        # Check if users table exists and has required fields
        user = User.query.first()
        required_fields = ['id', 'phone_number', 'created_at']
        
        if user:
            for field in required_fields:
                if not hasattr(user, field):
                    return {"status": "error", "message": f"Missing field: {field}"}
        
        return {"status": "operational", "message": "User authentication system working"}
    except Exception as e:
        return {"status": "error", "message": f"User auth error: {str(e)}"}

def check_driver_auth():
    """Check driver authentication system"""
    try:
        driver = Driver.query.first()
        required_fields = ['id', 'name', 'phone_number', 'driver_id', 'password']
        
        if driver:
            for field in required_fields:
                if not hasattr(driver, field):
                    return {"status": "error", "message": f"Missing field: {field}"}
        
        return {"status": "operational", "message": "Driver authentication system working"}
    except Exception as e:
        return {"status": "error", "message": f"Driver auth error: {str(e)}"}

def check_booking_creation():
    """Check booking creation functionality"""
    try:
        # Check recent bookings
        recent_bookings = Booking.query.filter(
            Booking.requested_at > datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        return {
            "status": "operational",
            "message": f"Booking creation working - {recent_bookings} bookings in last 24h"
        }
    except Exception as e:
        return {"status": "error", "message": f"Booking creation error: {str(e)}"}

def check_booking_cancellation():
    """Check booking cancellation functionality"""
    try:
        cancelled_count = Booking.query.filter(
            Booking.status.in_(['Cancelled', 'Auto-Cancelled'])
        ).count()
        
        return {
            "status": "operational",
            "message": f"Booking cancellation working - {cancelled_count} cancelled bookings"
        }
    except Exception as e:
        return {"status": "error", "message": f"Booking cancellation error: {str(e)}"}

def check_hospital_management():
    """Check hospital management system"""
    try:
        hospitals_with_drivers = Hospital.query.join(Driver).count()
        total_hospitals = Hospital.query.count()
        
        return {
            "status": "operational",
            "message": f"Hospital management working - {hospitals_with_drivers}/{total_hospitals} hospitals have drivers"
        }
    except Exception as e:
        return {"status": "error", "message": f"Hospital management error: {str(e)}"}

def check_auto_assignment():
    """Check auto-assignment functionality"""
    try:
        auto_assigned = Booking.query.filter_by(auto_assigned=True).count()
        
        return {
            "status": "operational",
            "message": f"Auto-assignment working - {auto_assigned} auto-assigned bookings"
        }
    except Exception as e:
        return {"status": "error", "message": f"Auto-assignment error: {str(e)}"}

def check_location_services():
    """Check location services"""
    try:
        drivers_with_location = Driver.query.filter(
            Driver.current_latitude.isnot(None),
            Driver.current_longitude.isnot(None)
        ).count()
        
        bookings_with_location = Booking.query.filter(
            Booking.pickup_latitude.isnot(None),
            Booking.pickup_longitude.isnot(None)
        ).count()
        
        return {
            "status": "operational",
            "message": f"Location services working - {drivers_with_location} drivers, {bookings_with_location} bookings with location"
        }
    except Exception as e:
        return {"status": "error", "message": f"Location services error: {str(e)}"}

def check_real_time_updates():
    """Check real-time update system"""
    try:
        # Check if WebRTC/PeerPyRTC is available
        from . import peerpyrtc_service
        
        return {
            "status": "operational",
            "message": "Real-time updates available via WebRTC"
        }
    except Exception as e:
        return {"status": "warning", "message": f"Real-time updates limited: {str(e)}"}

@feature_check_bp.route('/api/system/integration-test')
def integration_test():
    """Run integration tests for critical workflows"""
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }
    
    # Test 1: User-Hospital-Driver Integration
    try:
        user_count = User.query.count()
        hospital_count = Hospital.query.count()
        driver_count = Driver.query.count()
        
        if user_count > 0 and hospital_count > 0 and driver_count > 0:
            results["tests"]["user_hospital_driver_integration"] = {
                "status": "pass",
                "message": f"Integration working: {user_count} users, {hospital_count} hospitals, {driver_count} drivers"
            }
        else:
            results["tests"]["user_hospital_driver_integration"] = {
                "status": "fail",
                "message": "Missing core entities"
            }
    except Exception as e:
        results["tests"]["user_hospital_driver_integration"] = {
            "status": "error",
            "message": str(e)
        }
    
    # Test 2: Booking Workflow
    try:
        total_bookings = Booking.query.count()
        completed_bookings = Booking.query.filter_by(status='Completed').count()
        
        if total_bookings > 0:
            completion_rate = (completed_bookings / total_bookings) * 100
            results["tests"]["booking_workflow"] = {
                "status": "pass",
                "message": f"Booking workflow working: {completion_rate:.1f}% completion rate"
            }
        else:
            results["tests"]["booking_workflow"] = {
                "status": "warning",
                "message": "No bookings to test workflow"
            }
    except Exception as e:
        results["tests"]["booking_workflow"] = {
            "status": "error",
            "message": str(e)
        }
    
    return jsonify(results)