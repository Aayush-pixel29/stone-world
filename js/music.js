/**
 * Stone World — Procedural Music Engine
 * 
 * Generates an evolving soundtrack using the Web Audio API.
 * The complexity and instruments change based on the civilization tier.
 */

export class MusicEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.tier = 0;
    
    this.tempo = 110; // BPM
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // s
    
    this.current16thNote = 0;
    this.nextNoteTime = 0.0;
    this.timerID = null;
    
    // Gain nodes for mixing
    this.masterGain = null;
    this.drumGain = null;
    this.bassGain = null;
    this.arpGain = null;
    this.melodyGain = null;
  }

  init() {
    if (this.ctx) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Global volume
    this.masterGain.connect(this.ctx.destination);
    
    this.drumGain = this.ctx.createGain();
    this.drumGain.gain.value = 0.8;
    this.drumGain.connect(this.masterGain);
    
    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.6;
    this.bassGain.connect(this.masterGain);
    
    this.arpGain = this.ctx.createGain();
    this.arpGain.gain.value = 0.4;
    this.arpGain.connect(this.masterGain);
    
    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 0.5;
    this.melodyGain.connect(this.masterGain);
  }

  setTier(tier) {
    this.tier = tier;
    // Increase tempo slightly with tiers
    this.tempo = 110 + (tier * 5);
  }

  start() {
    if (this.isPlaying) return;
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    window.clearTimeout(this.timerID);
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note
    this.current16thNote++;
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
    }
  }

  scheduleNote(beatNumber, time) {
    // --- DRUMS (Primitive / Tribal) ---
    // Kick drum on 0, 8
    if (beatNumber % 8 === 0) {
      this.playKick(time);
    }
    // Snare/Clap on 4, 12 (starts at Tier 1)
    if (this.tier >= 1 && beatNumber % 8 === 4) {
      this.playSnare(time);
    }
    // Hi-hat (starts at Tier 2)
    if (this.tier >= 2 && beatNumber % 2 === 0) {
      this.playHiHat(time);
    }

    // --- BASS (Starts Tier 1) ---
    if (this.tier >= 1) {
      const bassPattern = [0, -1, 3, -1, 0, -1, -5, -1, 0, -1, 3, -1, 5, -1, -2, -1];
      const note = bassPattern[beatNumber];
      if (note !== -1) {
        this.playTone(time, 65.41 * Math.pow(2, note / 12), 0.2, 'triangle', this.bassGain); // C2 base
      }
    }

    // --- ARPEGGIO (Starts Tier 3 - Iron Age) ---
    if (this.tier >= 3) {
      const arpPattern = [0, 7, 12, 19, 0, 7, 12, 19, -5, 2, 7, 14, -5, 2, 7, 14];
      const note = arpPattern[beatNumber];
      this.playTone(time, 261.63 * Math.pow(2, note / 12), 0.1, 'square', this.arpGain); // C4 base
    }
    
    // --- MELODY (Starts Tier 4 - Electrical) ---
    if (this.tier >= 4) {
      // Slow melody (every 8th 16-note)
      if (beatNumber % 8 === 0) {
        const melPattern = [0, 3, 7, 10]; // C minor 7th
        const note = melPattern[(beatNumber / 8) % 4];
        this.playTone(time, 523.25 * Math.pow(2, note / 12), 0.4, 'sine', this.melodyGain); // C5 base
      }
    }
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  // Synthesizers
  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.drumGain);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  playSnare(time) {
    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    noise.connect(filter);
    
    const gain = this.ctx.createGain();
    filter.connect(gain);
    gain.connect(this.drumGain);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    noise.start(time);
  }

  playHiHat(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.connect(gain);
    
    // Bandpass filter for metallic sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 10000;
    gain.connect(filter);
    filter.connect(this.drumGain);

    osc.frequency.setValueAtTime(500, time);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    osc.start(time);
    osc.stop(time + 0.05);
  }

  playTone(time, freq, dur, type, outGain) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(outGain);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    
    osc.start(time);
    osc.stop(time + dur);
  }
}
