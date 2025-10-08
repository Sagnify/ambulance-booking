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
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'peer_id', 'offer']):
            return jsonify({"error": "Missing required fields"}), 400
            
        result = signaling_manager.offer(data['room'], data['peer_id'], data['offer'])
        return jsonify({"answer": result})
    except Exception as e:
        return jsonify({"error": "Offer failed"}), 500

@peerpyrtc_bp.route('/candidate', methods=['POST'])
def candidate():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'peer_id', 'candidate']):
            return jsonify({"error": "Missing required fields"}), 400
            
        signaling_manager.candidate(data['room'], data['peer_id'], data['candidate'])
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": "Candidate failed"}), 500

@peerpyrtc_bp.route('/leave', methods=['POST'])
def leave():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'peer_id']):
            return jsonify({"error": "Missing required fields"}), 400
            
        signaling_manager.leave(data['room'], data['peer_id'])
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": "Leave failed"}), 500

@peerpyrtc_bp.route('/status')
def get_status():
    return jsonify({
        "status": "active",
        "rooms": signaling_manager.rooms_info()
    })

# Standard WebRTC signaling for React Native
webrtc_rooms = {}

@peerpyrtc_bp.route('/webrtc/join', methods=['POST'])
def webrtc_join():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'peer_id']):
            return jsonify({"error": "Missing required fields"}), 400
            
        room = data['room']
        peer_id = data['peer_id']
        
        if room not in webrtc_rooms:
            webrtc_rooms[room] = {}
        
        webrtc_rooms[room][peer_id] = {
            'peer_id': peer_id,
            'joined_at': data.get('timestamp')
        }
        
        return jsonify({"status": "joined", "peers": list(webrtc_rooms[room].keys())})
    except Exception as e:
        return jsonify({"error": "Join failed"}), 500

@peerpyrtc_bp.route('/webrtc/signal', methods=['POST'])
def webrtc_signal():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'from', 'to', 'signal']):
            return jsonify({"error": "Missing required fields"}), 400
            
        room = data['room']
        from_peer = data['from']
        to_peer = data['to']
        signal_data = data['signal']
        
        # Store signal for target peer to retrieve
        if room not in webrtc_rooms:
            webrtc_rooms[room] = {}
        
        if 'signals' not in webrtc_rooms[room]:
            webrtc_rooms[room]['signals'] = []
        
        webrtc_rooms[room]['signals'].append({
            'from': from_peer,
            'to': to_peer,
            'signal': signal_data,
            'timestamp': data.get('timestamp')
        })
        
        return jsonify({"status": "signal_sent"})
    except Exception as e:
        return jsonify({"error": "Signal failed"}), 500

@peerpyrtc_bp.route('/webrtc/poll', methods=['POST'])
def webrtc_poll():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'peer_id']):
            return jsonify({"error": "Missing required fields"}), 400
            
        room = data['room']
        peer_id = data['peer_id']
        
        if room not in webrtc_rooms or 'signals' not in webrtc_rooms[room]:
            return jsonify({"signals": []})
        
        # Get signals for this peer
        signals = [s for s in webrtc_rooms[room]['signals'] if s['to'] == peer_id]
        
        # Remove retrieved signals
        webrtc_rooms[room]['signals'] = [s for s in webrtc_rooms[room]['signals'] if s['to'] != peer_id]
        
        return jsonify({"signals": signals})
    except Exception as e:
        return jsonify({"error": "Poll failed"}), 500

@peerpyrtc_bp.route('/webrtc/leave', methods=['POST'])
def webrtc_leave():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['room', 'peer_id']):
            return jsonify({"error": "Missing required fields"}), 400
            
        room = data['room']
        peer_id = data['peer_id']
        
        if room in webrtc_rooms and peer_id in webrtc_rooms[room]:
            del webrtc_rooms[room][peer_id]
            
            if len(webrtc_rooms[room]) == 0:
                del webrtc_rooms[room]
        
        return jsonify({"status": "left"})
    except Exception as e:
        return jsonify({"error": "Leave failed"}), 500