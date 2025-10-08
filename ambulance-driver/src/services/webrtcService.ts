import { API_BASE_URL } from './api';

interface WebRTCSignal {
  from: string;
  to: string;
  signal: any;
  timestamp?: number;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private room: string = '';
  private peerId: string = '';
  private pollingInterval: NodeJS.Timeout | null = null;
  private onDataChannel?: (data: any) => void;
  private dataChannel: RTCDataChannel | null = null;

  private rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  async joinRoom(room: string, peerId: string): Promise<void> {
    this.room = room;
    this.peerId = peerId;

    await fetch(`${API_BASE_URL}/webrtc/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, peer_id: peerId, timestamp: Date.now() })
    });

    this.startPolling();
  }

  async createPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.dataChannel = this.peerConnection.createDataChannel('location', {
      ordered: true
    });

    this.dataChannel.onopen = () => console.log('Data channel opened');
    this.dataChannel.onmessage = (event) => {
      if (this.onDataChannel) {
        this.onDataChannel(JSON.parse(event.data));
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (event) => {
        if (this.onDataChannel) {
          this.onDataChannel(JSON.parse(event.data));
        }
      };
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('ice-candidate', event.candidate);
      }
    };
  }

  async createOffer(targetPeerId: string): Promise<void> {
    if (!this.peerConnection) await this.createPeerConnection();

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    this.sendSignal('offer', { offer, targetPeerId });
  }

  async handleOffer(offer: RTCSessionDescriptionInit, fromPeerId: string): Promise<void> {
    if (!this.peerConnection) await this.createPeerConnection();

    await this.peerConnection!.setRemoteDescription(offer);
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    this.sendSignal('answer', { answer, targetPeerId: fromPeerId });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(answer);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(candidate);
    }
  }

  sendLocationUpdate(location: { latitude: number; longitude: number }): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'location_update',
        data: location,
        timestamp: Date.now()
      }));
    }
  }

  private async sendSignal(type: string, data: any): Promise<void> {
    await fetch(`${API_BASE_URL}/webrtc/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: this.room,
        from: this.peerId,
        to: data.targetPeerId || 'all',
        signal: { type, data },
        timestamp: Date.now()
      })
    });
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/webrtc/poll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: this.room,
            peer_id: this.peerId
          })
        });

        const { signals } = await response.json();

        for (const signal of signals) {
          await this.handleSignal(signal);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  }

  private async handleSignal(signal: WebRTCSignal): Promise<void> {
    const { type, data } = signal.signal;

    switch (type) {
      case 'offer':
        await this.handleOffer(data.offer, signal.from);
        break;
      case 'answer':
        await this.handleAnswer(data.answer);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(data);
        break;
    }
  }

  setOnDataChannel(callback: (data: any) => void): void {
    this.onDataChannel = callback;
  }

  async leaveRoom(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.room && this.peerId) {
      await fetch(`${API_BASE_URL}/webrtc/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: this.room,
          peer_id: this.peerId
        })
      });
    }

    this.dataChannel = null;
    this.room = '';
    this.peerId = '';
  }
}

export default new WebRTCService();