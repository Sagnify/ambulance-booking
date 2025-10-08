declare module 'peerpyrtc-client' {
  interface PeerPyRTCClientOptions {
    peerId: string;
    serverUrl: string;
  }

  class PeerPyRTCClient {
    constructor(options: PeerPyRTCClientOptions);
    connect(): Promise<void>;
    send(targetId: string, data: any): Promise<void>;
    onMessage(callback: (data: any) => void): void;
    disconnect(): void;
  }

  export = PeerPyRTCClient;
}