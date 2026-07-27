export class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.mediaConnection = null;
    this.localStream = null;
    
    this.isHost = false;
    this.roomCode = '';
    this.connected = false;

    this.onConnect = null;
    this.onDisconnect = null;
    this.onMessage = null;
    this.onError = null;

    this._targetRoomCode = null;
  }

  async getMicrophone() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.warn("Could not get microphone access:", err);
    }
  }

  async loadPeerJS() {
    if (window.Peer) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async host() {
    await this.loadPeerJS();
    await this.getMicrophone();
    this.isHost = true;
    this.roomCode = this._generateRoomCode();
    
    return new Promise((resolve, reject) => {
      this.peer = new Peer('stoneworld-' + this.roomCode);

      this.peer.on('open', (id) => {
        resolve(this.roomCode);
        
        // Handle Data Connection
        this.peer.on('connection', (conn) => {
          this.connection = conn;
          this._setupConnection(conn);
        });

        // Handle Media (Voice) Connection
        this.peer.on('call', (call) => {
          this.mediaConnection = call;
          if (this.localStream) {
            call.answer(this.localStream);
          } else {
            // Answer without stream just to accept
            call.answer();
          }
          call.on('stream', (remoteStream) => {
            this.playRemoteStream(remoteStream);
          });
        });

        this.peer.on('error', (err) => {
          this._handleError(err);
          reject(err);
        });
      });
    });
  }

  async join(roomCode) {
    await this.loadPeerJS();
    await this.getMicrophone();
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this._targetRoomCode = this.roomCode;
    
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on('open', (id) => {
        // Try to connect to host
        setTimeout(() => {
          const conn = this.peer.connect('stoneworld-' + this.roomCode, { reliable: true });
          this._setupConnection(conn);
          
          conn.on('open', () => {
            // Call the host for voice chat
            if (this.localStream) {
              this.mediaConnection = this.peer.call('stoneworld-' + this.roomCode, this.localStream);
              this.mediaConnection.on('stream', (remoteStream) => {
                this.playRemoteStream(remoteStream);
              });
            }
            resolve();
          });
          conn.on('error', (err) => reject(err));
        }, 500); // Small delay to let PeerJS stabilize
      });

      this.peer.on('error', (err) => {
        this._handleError(err);
        reject(err);
      });
    });
  }

  send(data) {
    if (this.connected && this.connection) {
      this.connection.send(data);
    }
  }

  _generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  _setupConnection(conn) {
    conn.on('open', () => {
      this.connected = true;
      if (this.onConnect) this.onConnect();
    });

    conn.on('data', (data) => {
      if (this.onMessage) this.onMessage(data);
    });

    conn.on('close', () => {
      this._handleDisconnect();
    });
    
    conn.on('error', (err) => {
      this._handleError(err);
    });
  }

  _handleError(err) {
    console.error("PeerJS Error:", err);
    if (err.type === 'peer-unavailable') {
      err.message = "Room not found.";
    }
    if (this.onError) this.onError(err);
  }

  _handleDisconnect() {
    this.connected = false;
    this.connection = null;
    this.mediaConnection = null;
    if (this.onDisconnect) this.onDisconnect();
  }

  playRemoteStream(stream) {
    let audio = document.getElementById('partner-voice');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'partner-voice';
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = stream;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // returns true if muted
      }
    }
    return false;
  }
}