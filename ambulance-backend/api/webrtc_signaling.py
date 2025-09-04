from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import json
import uuid
from datetime import datetime, timedelta

webrtc_bp = Blueprint('webrtc', __name__)

# In-memory storage for signaling (use Redis in production)
peer_connections = {}
signaling_messages = {}

@webrtc_bp.route('/webrtc/offer', methods=['POST'])
@cross_origin()
def handle_offer():
    data = request.get_json()
    peer_id = data.get('peer_id')
    target_id = data.get('target_id')
    offer = data.get('offer')
    
    if not all([peer_id, target_id, offer]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Store offer for target peer
    if target_id not in signaling_messages:
        signaling_messages[target_id] = []
    
    signaling_messages[target_id].append({
        'type': 'offer',
        'from': peer_id,
        'offer': offer,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    return jsonify({'status': 'offer_sent'})

@webrtc_bp.route('/webrtc/answer', methods=['POST'])
@cross_origin()
def handle_answer():
    data = request.get_json()
    peer_id = data.get('peer_id')
    target_id = data.get('target_id')
    answer = data.get('answer')
    
    if not all([peer_id, target_id, answer]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Store answer for target peer
    if target_id not in signaling_messages:
        signaling_messages[target_id] = []
    
    signaling_messages[target_id].append({
        'type': 'answer',
        'from': peer_id,
        'answer': answer,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    return jsonify({'status': 'answer_sent'})

@webrtc_bp.route('/webrtc/ice-candidate', methods=['POST'])
@cross_origin()
def handle_ice_candidate():
    data = request.get_json()
    peer_id = data.get('peer_id')
    target_id = data.get('target_id')
    candidate = data.get('candidate')
    
    if not all([peer_id, target_id, candidate]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Store ICE candidate for target peer
    if target_id not in signaling_messages:
        signaling_messages[target_id] = []
    
    signaling_messages[target_id].append({
        'type': 'ice-candidate',
        'from': peer_id,
        'candidate': candidate,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    return jsonify({'status': 'ice_candidate_sent'})

@webrtc_bp.route('/webrtc/messages/<peer_id>', methods=['GET'])
@cross_origin()
def get_messages(peer_id):
    messages = signaling_messages.get(peer_id, [])
    
    # Clear messages after retrieval
    if peer_id in signaling_messages:
        signaling_messages[peer_id] = []
    
    return jsonify({'messages': messages})

@webrtc_bp.route('/webrtc/register', methods=['POST'])
@cross_origin()
def register_peer():
    data = request.get_json()
    peer_id = data.get('peer_id')
    peer_type = data.get('peer_type')  # 'user' or 'hospital'
    
    if not all([peer_id, peer_type]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    peer_connections[peer_id] = {
        'type': peer_type,
        'registered_at': datetime.utcnow().isoformat(),
        'last_seen': datetime.utcnow().isoformat()
    }
    
    return jsonify({'status': 'registered', 'peer_id': peer_id})

@webrtc_bp.route('/webrtc/peers', methods=['GET'])
@cross_origin()
def get_peers():
    # Clean up old peers (older than 5 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    active_peers = {}
    
    for peer_id, peer_info in peer_connections.items():
        last_seen = datetime.fromisoformat(peer_info['last_seen'])
        if last_seen > cutoff:
            active_peers[peer_id] = peer_info
    
    peer_connections.clear()
    peer_connections.update(active_peers)
    
    return jsonify({'peers': peer_connections})

@webrtc_bp.route('/webrtc/heartbeat', methods=['POST'])
@cross_origin()
def heartbeat():
    data = request.get_json()
    peer_id = data.get('peer_id')
    
    if not peer_id:
        return jsonify({'error': 'Missing peer_id'}), 400
    
    if peer_id in peer_connections:
        peer_connections[peer_id]['last_seen'] = datetime.utcnow().isoformat()
        return jsonify({'status': 'heartbeat_received'})
    
    return jsonify({'error': 'Peer not registered'}), 404