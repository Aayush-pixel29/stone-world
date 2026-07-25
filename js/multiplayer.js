export class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isHost = false;
    this.roomCode = '';
    this.connected = false;
    this.onMessage = null;      // callback: (data) => {}
    this.onConnect = null;      // callback: () => {}
    this.onDisconnect = null;   // callback: () => {}
    this.onError = null;        // callback: (error) => {}
    
    this._heartbeatInterval = null;
    this._heartbeatTimeout = null;
    this._reconnectRetries = 0;
    this._maxRetries = 3;
    this._targetRoomCode = null;
  }

  async loadPeerJS() {
    if (window.Peer) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load PeerJS'));
      document.head.appendChild(script);
    });
  }

  _generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async host() {
    await this.loadPeerJS();
    this.isHost = true;
    this.roomCode = this._generateRoomCode();
    
    return new Promise((resolve, reject) => {
      try {
        this.peer = new window.Peer('stoneworld-' + this.roomCode);
        
        this.peer.on('open', (id) => {
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn) => {
          if (this.connection) {
            conn.close(); // Only allow one connection per host for simple setup
            return;
          }
          this._setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          this._handleError(err);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async join(roomCode) {
    await this.loadPeerJS();
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this._targetRoomCode = this.roomCode;
    this._reconnectRetries = 0;

    return this._connectToHost();
  }

  _connectToHost() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.peer || this.peer.destroyed) {
          this.peer = new window.Peer();
        }

        const onOpen = () => {
          const conn = this.peer.connect('stoneworld-' + this.roomCode, { reliable: true });
          this._setupConnection(conn);
          
          conn.on('open', () => resolve());
          conn.on('error', (err) => reject(err));
        };

        if (this.peer.open) {
          onOpen();
        } else {
          this.peer.once('open', onOpen);
          this.peer.once('error', (err) => {
            this._handleError(err);
            reject(err);
          });
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  _setupConnection(conn) {
    this.connection = conn;

    this.connection.on('open', () => {
      this.connected = true;
      this._reconnectRetries = 0;
      if (this.onConnect) this.onConnect();
      this._startHeartbeat();
    });

    this.connection.on('data', (data) => {
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {}
      }

      this._resetHeartbeatTimeout();

      if (data && data.type === 'heartbeat') {
        return; // Handled by resetting timeout
      }

      if (this.onMessage && data) {
        this.onMessage(data);
      }
    });

    this.connection.on('close', () => {
      this._handleDisconnect();
    });

    this.connection.on('error', (err) => {
      this._handleError(err);
    });
  }

  send(data) {
    if (!this.connected || !this.connection) return;
    
    const payload = {
      ...data,
      timestamp: Date.now()
    };
    
    this.connection.send(JSON.stringify(payload));
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    
    this._heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat', payload: null });
    }, 5000);

    this._resetHeartbeatTimeout();
  }

  _resetHeartbeatTimeout() {
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout);
    }
    
    this._heartbeatTimeout = setTimeout(() => {
      // 15s silence
      this._handleDisconnect();
    }, 15000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
    if (this._heartbeatTimeout) clearTimeout(this._heartbeatTimeout);
  }

  _handleDisconnect() {
    if (!this.connected) return;
    this.connected = false;
    this._stopHeartbeat();
    
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.onDisconnect) {
      this.onDisconnect();
    }

    if (!this.isHost && this._reconnectRetries < this._maxRetries) {
      this._reconnectRetries++;
      setTimeout(() => {
        this._connectToHost().catch(() => {});
      }, 2000 * this._reconnectRetries);
    }
  }

  _handleError(err) {
    let friendlyMessage = 'A multiplayer error occurred.';
    if (err.type === 'peer-unavailable') {
      friendlyMessage = 'Room not found. Check the code and try again.';
    } else if (err.type === 'network') {
      friendlyMessage = 'Network connection lost.';
    }

    if (this.onError) {
      this.onError({ originalError: err, message: friendlyMessage });
    }
  }

  disconnect() {
    this._stopHeartbeat();
    this.connected = false;
    this._reconnectRetries = this._maxRetries; // prevent reconnection
    
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export default MultiplayerManager;
