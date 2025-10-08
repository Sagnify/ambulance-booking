from flask import Blueprint, request, jsonify
from peerpyrtc import SignalingManager
import logging

# Initialize PeerPyRTC SignalingManager
signaling_manager = SignalingManager()
peerpyrtc_bp = Blueprint('peerpyrtc', __name__, url_prefix='/webrtc')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@peerpyrtc_bp.route('/offer', methods=['POST'])
def handle_offer():
    """Handle WebRTC offer signaling"""
    try:
        data = request.get_json()
        logger.info(f"Received offer: {data}")
        
        # Process offer through SignalingManager
        result = signaling_manager.handle_offer(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Offer handling error: {e}")
        return jsonify({"error": str(e)}), 500

@peerpyrtc_bp.route('/candidate', methods=['POST'])
def handle_candidate():
    """Handle WebRTC ICE candidate signaling"""
    try:
        data = request.get_json()
        logger.info(f"Received candidate: {data}")
        
        # Process candidate through SignalingManager
        result = signaling_manager.handle_candidate(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Candidate handling error: {e}")
        return jsonify({"error": str(e)}), 500

@peerpyrtc_bp.route('/leave', methods=['POST'])
def handle_leave():
    """Handle peer leaving room"""
    try:
        data = request.get_json()
        logger.info(f"Peer leaving: {data}")
        
        # Process leave through SignalingManager
        result = signaling_manager.handle_leave(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Leave handling error: {e}")
        return jsonify({"error": str(e)}), 500

# Event handlers for SignalingManager
@signaling_manager.on('message')
def on_message(peer_id, room_id, message):
    """Handle incoming messages"""
    logger.info(f"Message from {peer_id} in room {room_id}: {message}")
    # Broadcast to other peers in the room
    signaling_manager.broadcast_to_room(room_id, message, exclude=peer_id)

@signaling_manager.on('peer_joined')
def on_peer_joined(peer_id, room_id):
    """Handle peer joining room"""
    logger.info(f"Peer {peer_id} joined room {room_id}")
    # Notify other peers
    signaling_manager.broadcast_to_room(room_id, {
        'type': 'peer_joined',
        'peer_id': peer_id
    }, exclude=peer_id)

@signaling_manager.on('peer_left')
def on_peer_left(peer_id, room_id):
    """Handle peer leaving room"""
    logger.info(f"Peer {peer_id} left room {room_id}")
    # Notify other peers
    signaling_manager.broadcast_to_room(room_id, {
        'type': 'peer_left',
        'peer_id': peer_id
    }, exclude=peer_id)

@peerpyrtc_bp.route('/status')
def get_status():
    """Get WebRTC server status"""
    return jsonify({
        "status": "active",
        "rooms": signaling_manager.get_active_rooms(),
        "total_peers": signaling_manager.get_peer_count()
    })