from flask import Blueprint, jsonify
from .extensions import db
from .models import User

health_bp = Blueprint('health', __name__, url_prefix='/api/health')

@health_bp.route('/check', methods=['GET'])
def health_check():
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        
        # Test if tables exist
        try:
            User.query.first()
            db_status = "Tables exist"
        except Exception as e:
            db_status = f"Tables missing: {str(e)}"
        
        return jsonify({
            'status': 'ok',
            'database': db_status,
            'message': 'Server is running'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Database connection failed'
        }), 500