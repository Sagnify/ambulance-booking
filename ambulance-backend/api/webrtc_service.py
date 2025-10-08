from flask import Blueprint, request, jsonify
from peerpyrtc import PeerPyRTC
import json

# Initialize PeerPyRTC server
rtc_server = PeerPyRTC()
webrtc_bp = Blueprint('webrtc', __name__)

@webrtc_bp.route('/webrtc/offer', methods=['POST'])
def handle_offer():
    data = request.get_json()
    peer_id = data.get('peer_id')
    target_id = data.get('target_id')
    offer = data.get('offer')
    
    # Use PeerPyRTC to handle offer
    result = rtc_server.handle_offer(peer_id, target_id, offer)
    return jsonify(result)

@webrtc_bp.route('/webrtc/answer', methods=['POST'])
def handle_answer():
    data = request.get_json()
    peer_id = data.get('peer_id')
    target_id = data.get('target_id')
    answer = data.get('answer')
    
    # Use PeerPyRTC to handle answer
    result = rtc_server.handle_answer(peer_id, target_id, answer)
    return jsonify(result)

@webrtc_bp.route('/webrtc/ice-candidate', methods=['POST'])
def handle_ice_candidate():
    data = request.get_json()
    peer_id = data.get('peer_id')
    target_id = data.get('target_id')
    candidate = data.get('candidate')
    
    # Use PeerPyRTC to handle ICE candidate
    result = rtc_server.handle_ice_candidate(peer_id, target_id, candidate)
    return jsonify(result)

@webrtc_bp.route('/webrtc/register', methods=['POST'])
def register_peer():
    data = request.get_json()
    peer_id = data.get('peer_id')
    peer_type = data.get('peer_type', 'user')
    
    # Register peer with PeerPyRTC
    result = rtc_server.register_peer(peer_id, peer_type)
    return jsonify(result)

@webrtc_bp.route('/webrtc/messages/<peer_id>')
def get_messages(peer_id):
    # Get pending messages for peer
    messages = rtc_server.get_messages(peer_id)
    return jsonify({"messages": messages})

@webrtc_bp.route('/webrtc/heartbeat', methods=['POST'])
def heartbeat():
    data = request.get_json()
    peer_id = data.get('peer_id')
    
    # Update peer heartbeat
    rtc_server.update_heartbeat(peer_id)
    return jsonify({"status": "ok"})