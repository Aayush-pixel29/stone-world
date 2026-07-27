/**
 * Stone World — App Entry Point
 * 
 * Bootstraps the game: initializes engine, UI, audio, multiplayer, and 3D world.
 * Wires all modules together and handles the connection screen flow.
 */

import { GameEngine } from './engine.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { MultiplayerManager } from './multiplayer.js';
import { Game3D } from './game3d.js';
import { StoryEngine } from './story.js';
import { MusicEngine } from './music.js';

// ─── Initialize ──────────────────────────────────────────────────────
const engine = new GameEngine();
const audio = new AudioManager();
const ui = new UIManager(engine, audio);
const mp = new MultiplayerManager();
const story = new StoryEngine(engine);
const music = new MusicEngine();
let game3d = null;

let isMultiplayer = false;

// ─── Register Service Worker ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ─── Boot ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ui.init();
  ui.showConnectionScreen();
  setupConnectionScreen();
  setupMultiplayerCallbacks();
  setupStoryCallbacks();

  // Init audio & music on first user interaction (browser autoplay policy)
  const initAudio = () => {
    audio.init();
    music.init();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);
});

// ─── Story & Music Callbacks ─────────────────────────────────────────
function setupStoryCallbacks() {
  story.onObjectiveUpdate = (main, sub) => {
    ui.updateObjective(main, sub);
  };

  story.onDialogue = (lines) => {
    ui.showDialogue(lines);
  };

  // Sync music tier with engine tier
  engine.on('tierUp', (data) => {
    music.setTier(data.tier);
  });
}

// ─── Connection Screen Logic ─────────────────────────────────────────
function setupConnectionScreen() {
  const hostBtn = document.getElementById('host-btn');
  const joinBtn = document.getElementById('join-btn');
  const soloBtn = document.getElementById('solo-btn');
  const joinConnectBtn = document.getElementById('join-connect-btn');
  const joinCodeInput = document.getElementById('join-code-input');
  
  // Character Selection
  const charCards = document.querySelectorAll('.char-card');
  charCards.forEach(card => {
    card.addEventListener('click', () => {
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      engine.state.myCharacter = card.dataset.char;
      audio.playClick();
    });
  });

  // Default character
  engine.state.myCharacter = 'scientist';

  // HOST
  hostBtn?.addEventListener('click', async () => {
    audio.init();
    music.init();
    audio.playClick();
    hostBtn.disabled = true;
    hostBtn.textContent = '⏳ Creating room...';

    try {
      const roomCode = await mp.host();
      ui.showRoomCode(roomCode);
      ui.setConnectionStatusText('Waiting for partner to join...');
    } catch (err) {
      ui.setConnectionStatusText('❌ Failed to create room. Try again.');
      hostBtn.disabled = false;
      hostBtn.innerHTML = '<span class="btn-icon">📡</span> Host Game';
      console.error('Host error:', err);
    }
  });

  // JOIN
  joinBtn?.addEventListener('click', () => {
    audio.init();
    music.init();
    audio.playClick();
    ui.showJoinInput();
    joinCodeInput?.focus();
  });

  joinConnectBtn?.addEventListener('click', () => attemptJoin());
  joinCodeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptJoin();
  });

  async function attemptJoin() {
    const code = joinCodeInput?.value?.trim().toUpperCase();
    if (!code || code.length !== 6) {
      ui.setConnectionStatusText('Enter a 6-letter room code.');
      return;
    }
    audio.playClick();
    joinConnectBtn.disabled = true;
    joinConnectBtn.textContent = '⏳ Connecting...';
    ui.setConnectionStatusText('Connecting to partner...');

    try {
      await mp.join(code);
      // onConnect callback will handle the rest
    } catch (err) {
      ui.setConnectionStatusText('❌ Could not connect. Check the code.');
      joinConnectBtn.disabled = false;
      joinConnectBtn.textContent = 'Connect';
      console.error('Join error:', err);
    }
  }

  // SOLO
  soloBtn?.addEventListener('click', () => {
    audio.init();
    music.init();
    audio.playClick();
    isMultiplayer = false;
    startGame();
  });
}

// ─── Multiplayer Callbacks ───────────────────────────────────────────
function setupMultiplayerCallbacks() {
  mp.onConnect = () => {
    isMultiplayer = true;
    audio.playConnect();
    startGame();
    ui.updateConnectionStatus(true);
    ui.showSharedChest();
    ui.showChat();
    
    // Show mic buttons
    if (ui.els.btnMic) ui.els.btnMic.classList.remove('hidden');
    if (ui.els.mbtnMute) ui.els.mbtnMute.classList.remove('hidden');

    // Send our character choice immediately
    mp.send({
      type: 'characterSelect',
      payload: engine.state.myCharacter
    });

    engine.emit('log', {
      type: 'partner',
      text: '🤝 A fellow survivor has awoken! You are no longer alone.',
    });
  };

  mp.onDisconnect = () => {
    audio.playDisconnect();
    ui.updateConnectionStatus(false);
    ui.showToast('Partner disconnected', 'fail');
    engine.emit('log', {
      type: 'system',
      text: '⚠️ Your partner\'s connection was lost...',
    });
  };

  mp.onMessage = (data) => {
    if (data.type === 'characterSelect') {
      engine.state.partnerCharacter = data.payload;
      if (game3d) {
        // Re-init partner model if needed, or we just rely on engine.state
        // For now, let's just log it. game3d will spawn it if it handles partners.
        console.log("Partner selected character:", data.payload);
      }
    } else {
      engine.handlePartnerAction(data);
    }
  };

  mp.onError = (err) => {
    ui.showToast(err.message, 'fail');
    console.error('Multiplayer error:', err);
  };

  // Wire engine events to broadcast over multiplayer
  engine.on('craftSuccess', (data) => {
    if (isMultiplayer && mp.connected) {
      mp.send(engine.createCraftAction(data.reaction));
    }
  });

  engine.on('explore', (data) => {
    if (isMultiplayer && mp.connected) {
      mp.send(engine.createExploreAction(data.biomeId, data.found));
    }
  });

  // Wire chat
  ui.onChatSend = (text) => {
    if (isMultiplayer && mp.connected) {
      mp.send({
        type: 'chat',
        payload: {
          player: engine.playerName,
          text: text,
        },
      });
    }
  };
}

// ─── Start Game ──────────────────────────────────────────────────────
function startGame() {
  ui.hideConnectionScreen();
  engine.startGame(true);
  
  // Start Story & Music
  story.init();
  music.start();

  // Show mobile controls if on small screen
  if (window.innerWidth < 769) {
    document.getElementById('mobile-controls').classList.remove('hidden');
  }

  const toggleMic = () => {
    if (isMultiplayer) {
      const isMuted = mp.toggleMute();
      if (ui.els.btnMic) ui.els.btnMic.innerText = isMuted ? '🔇' : '🎤';
      if (ui.els.mbtnMute) ui.els.mbtnMute.innerText = isMuted ? '🔇' : '🎤';
    }
  };

  if (ui.els.btnMic) ui.els.btnMic.addEventListener('click', toggleMic);
  if (ui.els.mbtnMute) ui.els.mbtnMute.addEventListener('touchstart', (e) => { e.preventDefault(); toggleMic(); });

  // Initialize 3D Engine
  const canvasContainer = document.getElementById('game-canvas');
  if (canvasContainer && !game3d) {
    game3d = new Game3D(canvasContainer, engine);
    game3d.init();

    // Wire biome change from 3D to UI
    game3d.onBiomeChange = (biomeId) => {
      engine.state.currentBiome = biomeId; // Update engine state
      ui.updateBiomeHighlight(biomeId); // Update UI visuals
    };
    
    // Give UI access to game3d for minimap position tracking
    ui.setGame3D(game3d);
  }
}
