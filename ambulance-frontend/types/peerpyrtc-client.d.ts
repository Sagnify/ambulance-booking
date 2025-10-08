declare module 'peerpyrtc-client' {
  interface WebRTCConnectionOptions {
    peerId?: string;
    debug?: boolean;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
  }

  export class WebRTCConnection {
    constructor(roomName: string, options?: WebRTCConnectionOptions);
    
    // Connection methods
    connect(): Promise<void>;
    closeConnection(): Promise<void>;
    isConnected(): boolean;
    
    // Messaging methods
    sendMessage(message: string): void;
    emit(event: string, data: any): void;
    broadcast(event: string, data: any): void;
    
    // Room management
    getRoomPeers(): any[];
    getPeerCount(): number;
    isRoomHost(): boolean;
    
    // Event callbacks
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: any) => void;
    onMessage?: (senderId: string, message: string, event?: string) => void;
    onPeerJoined?: (peer: any) => void;
    onPeerLeft?: (peer: any) => void;
    onRoomUpdate?: (peers: any[]) => void;
    onStatusChange?: (status: string) => void;
  }
}