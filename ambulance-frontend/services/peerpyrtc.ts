class PeerPyRTCService {
  private peerId: string;
  private serverUrl: string;
  private onDataReceived: ((data: any) => void) | null = null;

  constructor(peerId: string) {
    this.peerId = peerId;
    this.serverUrl = 'https://ambulance-booking-roan.vercel.app/api';
  }

  async connect(peerType: 'user' | 'hospital' = 'user') {
    console.log('🔗 PeerPyRTC: Connecting peer', this.peerId);
    
    try {
      const response = await fetch(`${this.serverUrl}/webrtc/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peer_id: this.peerId,
          peer_type: peerType
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ PeerPyRTC: Connected successfully');
        return true;
      } else {
        console.error('❌ PeerPyRTC: Connection failed', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ PeerPyRTC: Connection error', error);
      return false;
    }
  }

  async sendData(toPeer: string, data: any) {
    console.log('📤 PeerPyRTC: Sending data to', toPeer);
    
    try {
      const response = await fetch(`${this.serverUrl}/webrtc/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_peer: this.peerId,
          to_peer: toPeer,
          message: data
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ PeerPyRTC: Data sent successfully');
        return true;
      } else {
        console.error('❌ PeerPyRTC: Send failed', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ PeerPyRTC: Send error', error);
      return false;
    }
  }

  async broadcast(data: any) {
    console.log('📡 PeerPyRTC: Broadcasting data');
    
    try {
      const response = await fetch(`${this.serverUrl}/webrtc/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_peer: this.peerId,
          message: data
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ PeerPyRTC: Broadcast successful');
        return true;
      } else {
        console.error('❌ PeerPyRTC: Broadcast failed', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ PeerPyRTC: Broadcast error', error);
      return false;
    }
  }

  async disconnect() {
    console.log('🔌 PeerPyRTC: Disconnecting peer', this.peerId);
    
    try {
      const response = await fetch(`${this.serverUrl}/webrtc/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peer_id: this.peerId
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ PeerPyRTC: Disconnected successfully');
        return true;
      } else {
        console.error('❌ PeerPyRTC: Disconnect failed', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ PeerPyRTC: Disconnect error', error);
      return false;
    }
  }

  onData(callback: (data: any) => void) {
    this.onDataReceived = callback;
  }

  sendBookingUpdate(bookingData: any) {
    const message = {
      type: 'booking_update',
      data: bookingData,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all hospital peers
    return this.broadcast(message);
  }
}

export default PeerPyRTCService;