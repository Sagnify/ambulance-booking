from flask import Blueprint, request, jsonify
from peerpyrtc import SignalingManager

# Initialize PeerPyRTC SignalingManager
signaling_manager = SignalingManager(debug=True)
webrtc_bp = Blueprint('webrtc', __name__)

# Handle messages
@signaling_manager.message_handler
async def on_message(room: str, peer_id: str, message: str):
    print(f"Message in {room} from {peer_id}: {message}")

# Handle peer events
@signaling_manager.peer_joined_handler
async def on_peer_joined(room: str, peer_id: str, peer_info: dict):
    print(f"🟢 {peer_id} joined {room}")

@signaling_manager.peer_left_handler
async def on_peer_left(room: str, peer_id: str, peer_info: dict):
    print(f"🔴 {peer_id} left {room}")

# Standard WebRTC signaling endpoints
@webrtc_bp.route('/offer', methods=['POST'])
def offer():
    data = request.json
    result = signaling_manager.offer(data['room'], data['peer_id'], data['offer'])
    return jsonify({"answer": result})

@webrtc_bp.route('/candidate', methods=['POST'])
def candidate():
    data = request.json
    signaling_manager.candidate(data['room'], data['peer_id'], data['candidate'])
    return jsonify({"status": "ok"})

@webrtc_bp.route('/leave', methods=['POST'])
def leave():
    data = request.json
    signaling_manager.leave(data['room'], data['peer_id'])
    return jsonify({"status": "ok"})