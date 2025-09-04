class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private peerId: string;
  private targetId: string | null = null;
  private isInitiator: boolean = false;
  private onDataReceived: ((data: any) => void) | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(peerId: string) {
    this.peerId = peerId;
  }

  async initialize(targetId: string, isInitiator: boolean = false) {
    this.targetId = targetId;
    this.isInitiator = isInitiator;

    // Register peer
    await fetch('https://ambulance-booking-roan.vercel.app/api/webrtc/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peer_id: this.peerId,
        peer_type: 'user'
      })
    });

    this.createPeerConnection();
    
    if (isInitiator) {
      this.createDataChannel();
      await this.createOffer();
    }

    this.startPolling();
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetId) {
        this.sendIceCandidate(event.candidate);
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannel(channel);
    };
  }

  private createDataChannel() {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('bookingUpdates', {
      ordered: true
    });
    
    this.setupDataChannel(this.dataChannel);
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;

    channel.onopen = () => {
      console.log('✅ WebRTC: Data channel opened - Real-time streaming active!');
      console.log('🔄 WebRTC: Stopping signaling polling (switching to real-time)');
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 WebRTC Real-time data received:', data);
        if (this.onDataReceived) {
          this.onDataReceived(data);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    channel.onclose = () => {
      console.log('❌ WebRTC: Data channel closed - Real-time streaming stopped');
    };
  }

  private async createOffer() {
    if (!this.peerConnection || !this.targetId) return;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await fetch('https://ambulance-booking-roan.vercel.app/api/webrtc/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peer_id: this.peerId,
        target_id: this.targetId,
        offer: offer
      })
    });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, fromPeerId: string) {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await fetch('https://ambulance-booking-roan.vercel.app/api/webrtc/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peer_id: this.peerId,
        target_id: fromPeerId,
        answer: answer
      })
    });
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(candidate);
  }

  private async sendIceCandidate(candidate: RTCIceCandidate) {
    if (!this.targetId) return;

    await fetch('https://ambulance-booking-roan.vercel.app/api/webrtc/ice-candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peer_id: this.peerId,
        target_id: this.targetId,
        candidate: candidate
      })
    });
  }

  private startPolling() {
    console.log('🔄 WebRTC: Starting signaling polling...');
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`https://ambulance-booking-roan.vercel.app/api/webrtc/messages/${this.peerId}`);
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          console.log(`📨 WebRTC: Received ${data.messages.length} signaling message(s)`);
        }

        for (const message of data.messages) {
          switch (message.type) {
            case 'offer':
              console.log('📥 WebRTC: Processing offer from', message.from);
              await this.handleOffer(message.offer, message.from);
              break;
            case 'answer':
              console.log('📥 WebRTC: Processing answer');
              await this.handleAnswer(message.answer);
              break;
            case 'ice-candidate':
              console.log('🧊 WebRTC: Processing ICE candidate');
              await this.handleIceCandidate(message.candidate);
              break;
          }
        }

        // Send heartbeat
        await fetch('https://ambulance-booking-roan.vercel.app/api/webrtc/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peer_id: this.peerId })
        });
      } catch (error) {
        console.error('❌ WebRTC Polling error:', error);
      }
    }, 200); // Faster polling for quicker signaling
  }

  sendBookingUpdate(bookingData: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'booking_update',
        data: bookingData,
        timestamp: new Date().toISOString()
      };
      this.dataChannel.send(JSON.stringify(message));
      console.log('📤 WebRTC Real-time: Sent booking update:', message);
      return true;
    }
    console.log('⚠️ WebRTC: Data channel not ready, cannot send real-time update');
    return false;
  }

  onData(callback: (data: any) => void) {
    this.onDataReceived = callback;
  }

  disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
    }
  }
}

export default WebRTCService;