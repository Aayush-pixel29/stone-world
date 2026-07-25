export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
    this._masterGain = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this.volume;
      this._masterGain.connect(this.ctx.destination);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this._masterGain) {
      this._masterGain.gain.value = this.enabled ? this.volume : 0;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this._masterGain) {
      this._masterGain.gain.value = this.enabled ? this.volume : 0;
    }
    return this.enabled;
  }

  _playTone(freq, type, duration, vol, startTimeOffset = 0, slideFreq = null) {
    if (!this.ctx || !this.enabled) return;
    
    const startTime = this.ctx.currentTime + startTimeOffset;
    
    const osc = this.ctx.createOscillator();
    osc.type = type;
    
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this._masterGain);
    
    osc.frequency.setValueAtTime(freq, startTime);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, startTime + duration);
    }
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(vol, startTime + duration * 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playCraftSuccess() {
    if (!this.ctx || !this.enabled) return;
    // Ascending chime: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      this._playTone(freq, 'triangle', 0.4, 0.2, i * 0.1);
    });
  }

  playCraftFail() {
    if (!this.ctx || !this.enabled) return;
    const startTime = this.ctx.currentTime;
    const duration = 0.3;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, startTime);
    osc2.frequency.setValueAtTime(105, startTime);
    osc1.frequency.exponentialRampToValueAtTime(50, startTime + duration);
    osc2.frequency.exponentialRampToValueAtTime(52, startTime + duration);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this._masterGain);
    
    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  playDiscovery() {
    if (!this.ctx || !this.enabled) return;
    const startTime = this.ctx.currentTime;
    const duration = 1.5;
    
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, startTime);
    osc.frequency.exponentialRampToValueAtTime(2000, startTime + duration * 0.5);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    // Add some "shimmer" (fake reverb with delay could be used, or just simple modulation)
    osc.connect(gainNode);
    gainNode.connect(this._masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playExplore() {
    if (!this.ctx || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this._masterGain);
    
    noise.start();
  }

  playPickup() {
    this._playTone(800, 'sine', 0.05, 0.1, 0, 1200);
  }

  playConnect() {
    this._playTone(440, 'sine', 0.2, 0.1, 0);
    this._playTone(880, 'sine', 0.4, 0.1, 0.2);
  }

  playDisconnect() {
    this._playTone(880, 'sine', 0.2, 0.1, 0);
    this._playTone(440, 'sine', 0.4, 0.1, 0.2);
  }

  playClick() {
    this._playTone(1000, 'sine', 0.02, 0.05);
  }

  playAmbient(biome) {
    if (!this.ctx || !this.enabled) return () => {};
    
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this._masterGain);
    
    if (biome === 'river') {
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      gainNode.gain.value = 0.05;
    } else if (biome === 'forest') {
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      gainNode.gain.value = 0.02;
    } else if (biome === 'cave') {
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      gainNode.gain.value = 0.08;
    } else if (biome === 'coast') {
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      gainNode.gain.value = 0.05;
      
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2; // 5 second waves
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.03;
      
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      lfo.start();
      
      noise.start();
      return () => {
        noise.stop();
        lfo.stop();
        noise.disconnect();
        lfo.disconnect();
      };
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      gainNode.gain.value = 0.01;
    }
    
    noise.start();
    return () => {
      noise.stop();
      noise.disconnect();
    };
  }
}

export default AudioManager;
