from flask import Blueprint, request, jsonify
from peerpyrtc import PeerPyRTCServer
from peerpyrtc_client import PeerPyRTCClient

# Initialize PeerPyRTC server
rtc_server = PeerPyRTCServer()
peerpyrtc_bp = Blueprint('peerpyrtc', __name__)

# Store active connections
active_connections = {}

@peerpyrtc_bp.route('/webrtc/connect', methods=['POST'])
def connect_peer():
    """Connect a new peer to the WebRTC network"""
    data = request.get_json()
    peer_id = data.get('peer_id')
    peer_type = data.get('peer_type', 'user')  # 'user' or 'hospital'
    
    try:
        # Create new peer connection
        peer = rtc_server.create_peer(peer_id, peer_type)
        active_connections[peer_id] = peer
        
        return jsonify({
            "status": "connected",
            "peer_id": peer_id,
            "message": "Peer connected successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@peerpyrtc_bp.route('/webrtc/send', methods=['POST'])
def send_data():
    """Send data to a specific peer"""
    data = request.get_json()
    from_peer = data.get('from_peer')
    to_peer = data.get('to_peer')
    message = data.get('message')
    
    try:
        if from_peer in active_connections and to_peer in active_connections:
            # Send data through PeerPyRTC
            rtc_server.send_data(from_peer, to_peer, message)
            return jsonify({"status": "sent"})
        else:
            return jsonify({"error": "Peer not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@peerpyrtc_bp.route('/webrtc/broadcast', methods=['POST'])
def broadcast_data():
    """Broadcast data to all connected peers"""
    data = request.get_json()
    from_peer = data.get('from_peer')
    message = data.get('message')
    
    try:
        if from_peer in active_connections:
            rtc_server.broadcast(from_peer, message)
            return jsonify({"status": "broadcasted"})
        else:
            return jsonify({"error": "Peer not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@peerpyrtc_bp.route('/webrtc/disconnect', methods=['POST'])
def disconnect_peer():
    """Disconnect a peer"""
    data = request.get_json()
    peer_id = data.get('peer_id')
    
    try:
        if peer_id in active_connections:
            rtc_server.disconnect_peer(peer_id)
            del active_connections[peer_id]
            return jsonify({"status": "disconnected"})
        else:
            return jsonify({"error": "Peer not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@peerpyrtc_bp.route('/webrtc/status')
def get_status():
    """Get WebRTC server status"""
    return jsonify({
        "active_connections": len(active_connections),
        "peers": list(active_connections.keys())
    })