from flask import Blueprint, request, jsonify
from peerpyrtc import SignalingManager

# Initialize PeerPyRTC SignalingManager
signaling_manager = SignalingManager(debug=True)
peerpyrtc_bp = Blueprint('peerpyrtc', __name__)

# Message handler
@signaling_manager.message_handler
async def on_message(room_name: str, sender_id: str, message: str):
    print(f"Message in {room_name} from {sender_id}: {message}")

# Peer event handlers
@signaling_manager.peer_joined_handler
async def on_peer_joined(room_name: str, peer_id: str, peer_info: dict):
    print(f"🟢 {peer_id} joined {room_name}")

@signaling_manager.peer_left_handler
async def on_peer_left(room_name: str, peer_id: str, peer_info: dict):
    print(f"🔴 {peer_id} left {room_name}")

# Standard WebRTC signaling endpoints
@peerpyrtc_bp.route('/offer', methods=['POST'])
def offer():
    data = request.json
    result = signaling_manager.offer(data['room'], data['peer_id'], data['offer'])
    return jsonify({"answer": result})

@peerpyrtc_bp.route('/candidate', methods=['POST'])
def candidate():
    data = request.json
    signaling_manager.candidate(data['room'], data['peer_id'], data['candidate'])
    return jsonify({"status": "ok"})

@peerpyrtc_bp.route('/leave', methods=['POST'])
def leave():
    data = request.json
    signaling_manager.leave(data['room'], data['peer_id'])
    return jsonify({"status": "ok"})

@peerpyrtc_bp.route('/status')
def get_status():
    return jsonify({
        "status": "active",
        "rooms": signaling_manager.rooms_info()
    })