/**
 * Stone World — UI Manager (3D Overlay Version)
 * 
 * Handles all DOM rendering, drag-and-drop crafting, animations,
 * and user interactions. Bridges the GameEngine to the visual interface.
 */

import { ITEMS, BIOMES } from './world.js';
import { PROCESSES } from './reactions.js';

export class UIManager {
  constructor(engine, audio) {
    this.engine = engine;
    this.audio = audio;
    this.draggedItem = null;
    this.stopAmbient = null;
    this.logQueue = [];
    this.isTyping = false;
    this.journalOpen = false;
    this.craftingOpen = false;
    this.game3d = null; // Reference to the 3D engine
    
    // Story State
    this.dialogueQueue = [];
    this.isShowingDialogue = false;
    
    // Minimap tracking
    this.minimapLoop = null;

    // DOM references
    this.els = {};
  }

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupEngineListeners();
    this.renderProcessSelector();
    this.renderInventory();
    this.renderQuickInventory();
    this.updateHUD();
  }

  setGame3D(game3d) {
    this.game3d = game3d;
    if (!this.minimapLoop) {
      this.startMinimapTracking();
    }
  }

  cacheElements() {
    const ids = [
      'connection-screen', 'hud', 'game-canvas',
      'world-log', 'world-log-float',
      'crafting-bench', 'crafting-panel', 'craft-result',
      'combine-btn', 'process-selector',
      'inventory', 'inventory-panel', 'inv-count',
      'shared-chest', 'chest-items',
      'chat-panel', 'chat-messages', 'chat-input',
      'discovery-modal', 'toast-container',
      'journal-modal', 'journal-entries',
      'day-counter', 'tier-progress', 'tier-label',
      'connection-status', 'audio-toggle',
      'host-btn', 'join-btn', 'solo-btn',
      'room-code-display', 'room-code-value',
      'join-input-area', 'join-code-input', 'join-connect-btn',
      'connection-status-text',
      'biome-indicator', 'biome-emoji', 'biome-name',
      'quick-inventory', 'inventory-bar', 'open-crafting-btn', 'explore-btn',
      'crafting-overlay', 'close-crafting-btn', 'journal-close-btn',
      'mini-map', 'minimap-dot',
      'objective-tracker', 'obj-main', 'obj-sub',
      'story-overlay', 'story-text'
    ];
    ids.forEach(id => {
      this.els[this.camelCase(id)] = document.getElementById(id);
    });
    // Craft slots
    this.els.craftSlots = document.querySelectorAll('.craft-slot');
  }

  camelCase(str) {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  // ─── Connection Screen ─────────────────────────────────────────────
  showConnectionScreen() {
    if (this.els.connectionScreen) this.els.connectionScreen.classList.remove('hidden');
  }

  hideConnectionScreen() {
    const screen = this.els.connectionScreen;
    if (screen) {
      screen.classList.add('fade-out');
      setTimeout(() => {
        screen.classList.add('hidden');
        screen.classList.remove('fade-out');
      }, 600);
    }
  }

  showRoomCode(code) {
    if (this.els.roomCodeDisplay) {
      this.els.roomCodeDisplay.classList.remove('hidden');
      if (this.els.roomCodeValue) this.els.roomCodeValue.textContent = code;
    }
    this.setConnectionStatusText('Waiting for partner...');
  }

  showJoinInput() {
    if (this.els.joinInputArea) this.els.joinInputArea.classList.remove('hidden');
  }

  setConnectionStatusText(text) {
    if (this.els.connectionStatusText) this.els.connectionStatusText.textContent = text;
  }

  // ─── Event Listeners ──────────────────────────────────────────────
  setupEventListeners() {
    // Crafting overlay toggle
    if (this.els.openCraftingBtn) {
      this.els.openCraftingBtn.addEventListener('click', () => this.toggleCrafting());
    }
    if (this.els.closeCraftingBtn) {
      this.els.closeCraftingBtn.addEventListener('click', () => this.toggleCrafting());
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return; // Ignore if typing in chat
      
      // Story Dialogue Advance
      if (e.code === 'Space' && this.isShowingDialogue) {
        e.preventDefault();
        this.advanceDialogue();
        return;
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleCrafting();
      }
      if (e.code === 'KeyE') {
        this.handleExplore();
      }
    });

    // Explore button
    if (this.els.exploreBtn) {
      this.els.exploreBtn.addEventListener('click', () => this.handleExplore());
    }

    // Combine button
    if (this.els.combineBtn) {
      this.els.combineBtn.addEventListener('click', () => {
        this.audio?.playClick();
        this.handleCraft();
      });
    }

    // Audio toggle
    if (this.els.audioToggle) {
      this.els.audioToggle.addEventListener('click', () => {
        if (this.audio) {
          this.audio.toggle();
          this.els.audioToggle.textContent = this.audio.enabled ? '🔊' : '🔇';
        }
      });
    }

    // Chat input
    if (this.els.chatInput) {
      this.els.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.els.chatInput.value.trim()) {
          this.onChatSend?.(this.els.chatInput.value.trim());
          this.addChatMessage('You', this.els.chatInput.value.trim(), false);
          this.els.chatInput.value = '';
        }
      });
    }

    // Journal toggle
    const journalBtn = document.getElementById('journal-btn');
    if (journalBtn) {
      journalBtn.addEventListener('click', () => {
        this.audio?.playClick();
        this.toggleJournal();
      });
    }
    if (this.els.journalCloseBtn) {
      this.els.journalCloseBtn.addEventListener('click', () => this.toggleJournal());
    }
    if (this.els.journalModal) {
      this.els.journalModal.addEventListener('click', (e) => {
        if (e.target === this.els.journalModal) this.toggleJournal();
      });
    }

    // Craft slot click to remove item
    this.els.craftSlots.forEach((slot, i) => {
      slot.addEventListener('click', () => {
        if (this.engine.state.craftSlots[i]) {
          this.audio?.playClick();
          this.engine.setCraftSlot(i, null);
        }
      });
    });

    // Room code copy
    const copyBtn = document.getElementById('copy-code-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const code = this.els.roomCodeValue?.textContent;
        if (code) {
          navigator.clipboard?.writeText(code).then(() => {
            this.showToast('Room code copied!', 'system');
          });
        }
      });
    }

    // New game button
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        if (confirm('Start a new game? All progress will be lost.')) {
          this.engine.newGame();
        }
      });
    }

    // Discovery modal dismiss
    if (this.els.discoveryModal) {
      this.els.discoveryModal.addEventListener('click', () => {
        this.els.discoveryModal.classList.add('hidden');
      });
    }
    
    // Close crafting by clicking backdrop
    if (this.els.craftingOverlay) {
      const backdrop = this.els.craftingOverlay.querySelector('.overlay-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this.toggleCrafting());
      }
    }
  }

  // ─── Engine Event Listeners ────────────────────────────────────────
  setupEngineListeners() {
    this.engine.on('log', (data) => this.addLog(data.text, data.type));
    this.engine.on('inventoryChange', () => {
      this.renderInventory();
      this.renderQuickInventory();
    });
    this.engine.on('craftSlotsChange', (slots) => this.renderCraftSlots(slots));
    this.engine.on('chestChange', () => this.renderSharedChest());
    this.engine.on('stateChange', () => this.updateHUD());
    this.engine.on('timeChange', (data) => this.updateTimeVisuals(data));

    this.engine.on('craftSuccess', (data) => {
      this.audio?.playCraftSuccess();
      this.animateCraftSuccess();
      this.showDiscoveryModal(data.outputItem, data.reaction);
    });

    this.engine.on('craftFail', () => {
      this.audio?.playCraftFail();
      this.animateCraftFail();
    });

    this.engine.on('newDiscovery', (data) => {
      this.audio?.playDiscovery();
    });

    this.engine.on('explore', (data) => {
      this.audio?.playExplore();
    });

    this.engine.on('tierUp', (data) => {
      this.showToast(`🏛️ Tier ${data.tier} Unlocked!`, 'discovery');
    });

    this.engine.on('chatMessage', (data) => {
      this.addChatMessage(data.sender, data.text, data.isPartner);
    });
  }

  // ─── Overlay Toggles ───────────────────────────────────────────────
  toggleCrafting() {
    this.craftingOpen = !this.craftingOpen;
    if (this.els.craftingOverlay) {
      if (this.craftingOpen) {
        this.els.craftingOverlay.classList.remove('hidden');
        this.audio?.playClick();
      } else {
        this.els.craftingOverlay.classList.add('hidden');
        this.audio?.playClick();
      }
    }
  }

  handleExplore() {
    const biomeId = this.engine.state.currentBiome || 'forest';
    if (this.els.exploreBtn) {
      this.els.exploreBtn.style.transform = 'scale(0.95)';
      setTimeout(() => this.els.exploreBtn.style.transform = '', 150);
    }
    
    // Visual feedback on the minimap
    const cell = document.querySelector(`.minimap-cell[data-biome="${biomeId}"]`);
    if (cell) {
      cell.style.boxShadow = 'inset 0 0 15px rgba(255,255,255,0.8)';
      setTimeout(() => cell.style.boxShadow = '', 300);
    }
    
    this.engine.explore(biomeId);
  }

  // ─── Minimap Tracking ──────────────────────────────────────────────
  startMinimapTracking() {
    const updateMinimap = () => {
      if (this.game3d && this.game3d.character && this.els.minimapDot) {
        const x = this.game3d.character.position.x;
        const z = this.game3d.character.position.z;
        // Map -100..100 to 0..100%
        const px = ((x + 100) / 200) * 100;
        const py = ((z + 100) / 200) * 100;
        this.els.minimapDot.style.left = `${px}%`;
        this.els.minimapDot.style.top = `${py}%`;
      }
      this.minimapLoop = requestAnimationFrame(updateMinimap);
    };
    updateMinimap();
  }

  // ─── World Log ─────────────────────────────────────────────────────
  addLog(text, type = 'system') {
    this.logQueue.push({ text, type });
    if (!this.isTyping) {
      this.processLogQueue();
    }
  }

  processLogQueue() {
    if (this.logQueue.length === 0) {
      this.isTyping = false;
      return;
    }
    this.isTyping = true;
    const { text, type } = this.logQueue.shift();
    const logEl = this.els.worldLog;
    if (!logEl) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${type} log-animate`;

    const typeIcons = {
      discovery: '✦',
      craft: '⚗️',
      fail: '✗',
      system: '›',
      partner: '⚐',
    };

    entry.innerHTML = `<span class="log-icon">${typeIcons[type] || '›'}</span><span class="log-text">${text}</span>`;
    logEl.appendChild(entry);

    logEl.scrollTop = logEl.scrollHeight;

    setTimeout(() => this.processLogQueue(), 150);
  }

  // ─── Crafting ──────────────────────────────────────────────────────
  renderProcessSelector() {
    const container = this.els.processSelector;
    if (!container) return;

    const processes = this.engine.getAllProcesses();
    container.innerHTML = '';

    Object.entries(processes).forEach(([id, proc]) => {
      const label = document.createElement('label');
      label.className = `process-option ${id === this.engine.state.selectedProcess ? 'active' : ''}`;
      label.innerHTML = `
        <input type="radio" name="process" value="${id}" 
               ${id === this.engine.state.selectedProcess ? 'checked' : ''}>
        <span class="process-emoji">${proc.emoji}</span>
        <span class="process-name">${proc.name}</span>
      `;
      label.querySelector('input').addEventListener('change', () => {
        this.engine.setProcess(id);
        container.querySelectorAll('.process-option').forEach(o => o.classList.remove('active'));
        label.classList.add('active');
        this.audio?.playClick();
      });
      container.appendChild(label);
    });
  }

  renderCraftSlots(slots) {
    this.els.craftSlots.forEach((slotEl, i) => {
      const itemId = slots[i];
      if (itemId && ITEMS[itemId]) {
        const item = ITEMS[itemId];
        slotEl.innerHTML = `
          <span class="slot-emoji">${item.emoji}</span>
          <span class="slot-name">${item.name}</span>
        `;
        slotEl.classList.add('filled');
        slotEl.title = `${item.name} — click to remove`;
      } else {
        slotEl.innerHTML = `<span class="slot-placeholder">+</span>`;
        slotEl.classList.remove('filled');
        slotEl.title = 'Drag an item here';
      }
    });
  }

  handleCraft() {
    const btn = this.els.combineBtn;
    if (btn) {
      btn.classList.add('pressing');
      setTimeout(() => btn.classList.remove('pressing'), 200);
    }
    this.engine.craft();
  }

  animateCraftSuccess() {
    const bench = this.els.craftingPanel;
    if (bench) {
      bench.classList.add('craft-success-flash');
      this.createParticleBurst(bench);
      setTimeout(() => bench.classList.remove('craft-success-flash'), 1000);
    }
  }

  animateCraftFail() {
    const bench = this.els.craftingPanel;
    if (bench) {
      bench.classList.add('craft-fail-shake');
      setTimeout(() => bench.classList.remove('craft-fail-shake'), 500);
    }
  }

  createParticleBurst(container) {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'craft-particle';
      const angle = (i / particleCount) * 360;
      const distance = 60 + Math.random() * 40;
      particle.style.setProperty('--angle', `${angle}deg`);
      particle.style.setProperty('--distance', `${distance}px`);
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  }

  // ─── Inventory ─────────────────────────────────────────────────────
  renderInventory() {
    const container = this.els.inventory;
    if (!container) return;

    const inv = this.engine.getInventory();
    const items = Object.entries(inv);

    if (items.length === 0) {
      container.innerHTML = `
        <div class="inventory-empty">
          <span class="empty-icon">🪹</span>
          <span class="empty-text">Inventory empty.<br>Explore to gather resources.</span>
        </div>
      `;
    } else {
      container.innerHTML = items.map(([id, qty]) => {
        const item = ITEMS[id];
        if (!item) return '';
        return `
          <div class="item-card" draggable="true" data-item-id="${id}" title="${item.description}">
            <span class="item-emoji">${item.emoji}</span>
            <span class="item-name">${item.name}</span>
            <span class="item-qty">${qty}</span>
          </div>
        `;
      }).join('');
    }

    if (this.els.invCount) {
      const total = Object.values(inv).reduce((sum, q) => sum + q, 0);
      this.els.invCount.textContent = total > 0 ? `(${total})` : '';
    }

    this.setupInventoryDrag();
  }

  renderQuickInventory() {
    const container = this.els.inventoryBar;
    if (!container) return;
    
    const inv = this.engine.getInventory();
    const items = Object.entries(inv);
    
    if (items.length === 0) {
      container.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); padding:5px;">No items</span>`;
    } else {
      container.innerHTML = items.map(([id, qty]) => {
        const item = ITEMS[id];
        if (!item) return '';
        return `
          <div class="inv-bar-item" data-item-id="${id}" title="${item.name}">
            <span class="bar-emoji">${item.emoji}</span>
            <span class="bar-qty">${qty}</span>
            <span class="bar-name">${item.name}</span>
          </div>
        `;
      }).join('');
      
      // Allow clicking quick inventory to add to crafting directly if it's open,
      // or to open it and add.
      container.querySelectorAll('.inv-bar-item').forEach(card => {
        card.addEventListener('click', () => {
          if (!this.craftingOpen) this.toggleCrafting();
          const itemId = card.dataset.itemId;
          const slots = this.engine.state.craftSlots;
          const emptySlot = slots.indexOf(null);
          if (emptySlot !== -1) {
            this.engine.setCraftSlot(emptySlot, itemId);
            this.audio?.playPickup();
          }
        });
      });
    }
  }

  // ─── Drag and Drop ─────────────────────────────────────────────────
  setupDragAndDrop() {
    this.els.craftSlots.forEach((slot, i) => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        const itemId = e.dataTransfer.getData('text/plain');
        if (itemId) {
          this.engine.setCraftSlot(i, itemId);
          this.audio?.playPickup();
        }
      });
    });
  }

  setupInventoryDrag() {
    document.querySelectorAll('.item-card[draggable]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const itemId = card.dataset.itemId;
        e.dataTransfer.setData('text/plain', itemId);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
        this.draggedItem = itemId;
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.draggedItem = null;
      });

      card.addEventListener('click', () => {
        const itemId = card.dataset.itemId;
        const slots = this.engine.state.craftSlots;
        const emptySlot = slots.indexOf(null);
        if (emptySlot !== -1) {
          this.engine.setCraftSlot(emptySlot, itemId);
          this.audio?.playPickup();
        }
      });
    });
  }

  // ─── Shared Chest ─────────────────────────────────────────────────
  renderSharedChest() {
    const container = this.els.chestItems;
    if (!container) return;

    const chest = this.engine.state.sharedChest;
    const items = Object.entries(chest);

    if (items.length === 0) {
      container.innerHTML = `<div class="chest-empty">Chest is empty</div>`;
    } else {
      container.innerHTML = items.map(([id, qty]) => {
        const item = ITEMS[id];
        if (!item) return '';
        return `
          <div class="chest-item" data-item-id="${id}" title="Click to take">
            <span class="item-emoji">${item.emoji}</span>
            <span class="item-name">${item.name}</span>
            <span class="item-qty">${qty}</span>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.chest-item').forEach(card => {
        card.addEventListener('click', () => {
          const itemId = card.dataset.itemId;
          this.engine.takeFromChest(itemId, 1);
          this.audio?.playPickup();
        });
      });
    }
  }

  showSharedChest() {
    if (this.els.sharedChest) this.els.sharedChest.classList.remove('hidden');
  }

  // ─── HUD / Biome ───────────────────────────────────────────────────
  updateHUD() {
    const progress = this.engine.getProgress();

    if (this.els.dayCounter) this.els.dayCounter.textContent = `Day ${progress.dayCount}`;
    if (this.els.tierLabel) this.els.tierLabel.textContent = `Tier ${progress.currentTier}`;
    if (this.els.tierProgress) {
      this.els.tierProgress.style.width = `${progress.tierPercent}%`;
      this.els.tierProgress.title = `${progress.reactionsDiscovered}/${progress.reactionsTotal} reactions discovered`;
    }
  }

  updateBiomeHighlight(biomeId) {
    if (this.els.biomeEmoji && this.els.biomeName) {
      const biome = BIOMES[biomeId];
      if (biome) {
        this.els.biomeEmoji.textContent = biome.emoji;
        this.els.biomeName.textContent = biome.name;
        
        // Handle ambient audio swap
        if (this.audio) {
          if (this.stopAmbient) this.stopAmbient();
          this.stopAmbient = this.audio.playAmbient(biomeId) || null;
        }
      }
    }
    
    // Update minimap tiles
    document.querySelectorAll('.minimap-cell').forEach(cell => {
      cell.classList.toggle('active', cell.dataset.biome === biomeId);
    });
  }

  updateConnectionStatus(connected) {
    if (this.els.connectionStatus) {
      this.els.connectionStatus.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
      this.els.connectionStatus.title = connected ? 'Partner connected' : 'Solo mode';
    }
  }

  updateTimeVisuals(data) {
    // In 3D mode, time visuals can be passed to game3d to change lighting.
    // For now, we'll let game3d be daytime always, or implement later.
  }

  // ─── Discovery Modal ──────────────────────────────────────────────
  showDiscoveryModal(item, reaction) {
    const modal = this.els.discoveryModal;
    if (!modal || !item) return;

    modal.innerHTML = `
      <div class="discovery-content">
        <div class="discovery-emoji">${item.emoji}</div>
        <h3 class="discovery-name">${item.name}</h3>
        <p class="discovery-desc">${item.description}</p>
        ${reaction.science ? `<p class="discovery-science">${reaction.science}</p>` : ''}
        <span class="discovery-tier">Tier ${reaction.tier}</span>
      </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('modal-enter');

    setTimeout(() => modal.classList.remove('modal-enter'), 300);
    setTimeout(() => modal.classList.add('hidden'), 4000);
  }

  // ─── Toast Notifications ──────────────────────────────────────────
  showToast(text, type = 'system') {
    const container = this.els.toastContainer;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = text;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── Chat ──────────────────────────────────────────────────────────
  addChatMessage(sender, text, isPartner) {
    const container = this.els.chatMessages;
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `chat-msg ${isPartner ? 'partner' : 'self'}`;
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  showChat() {
    if (this.els.chatPanel) this.els.chatPanel.classList.remove('hidden');
  }

  // ─── Journal ───────────────────────────────────────────────────────
  toggleJournal() {
    this.journalOpen = !this.journalOpen;
    if (this.els.journalModal) {
      if (this.journalOpen) {
        this.renderJournal();
        this.els.journalModal.classList.remove('hidden');
      } else {
        this.els.journalModal.classList.add('hidden');
      }
    }
  }

  renderJournal() {
    const container = this.els.journalEntries;
    if (!container) return;

    const journal = this.engine.getJournal();
    if (journal.length === 0) {
      container.innerHTML = `<p class="journal-empty">No discoveries yet. Start experimenting!</p>`;
      return;
    }

    const byTier = {};
    journal.forEach(entry => {
      if (!byTier[entry.tier]) byTier[entry.tier] = [];
      byTier[entry.tier].push(entry);
    });

    container.innerHTML = Object.entries(byTier)
      .sort(([a], [b]) => a - b)
      .map(([tier, entries]) => `
        <div class="journal-tier">
          <h4>Tier ${tier}</h4>
          ${entries.map(e => `
            <div class="journal-entry">
              <span class="journal-recipe">${e.inputs} <em>(${e.process})</em> → <strong>${e.output}</strong></span>
              ${e.science ? `<span class="journal-science">${e.science}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('');
  }

  // ─── Story UI ──────────────────────────────────────────────────────
  updateObjective(main, sub) {
    if (this.els.objMain) this.els.objMain.textContent = main;
    if (this.els.objSub) this.els.objSub.textContent = sub;
    
    // Pulse animation
    if (this.els.objectiveTracker) {
      this.els.objectiveTracker.style.transform = 'scale(1.05)';
      this.els.objectiveTracker.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
      setTimeout(() => {
        this.els.objectiveTracker.style.transform = '';
        this.els.objectiveTracker.style.boxShadow = '';
      }, 500);
    }
  }

  showDialogue(lines) {
    this.dialogueQueue = [...lines];
    this.isShowingDialogue = true;
    if (this.els.storyOverlay) {
      this.els.storyOverlay.classList.remove('hidden');
    }
    this.advanceDialogue();
  }

  advanceDialogue() {
    if (this.dialogueQueue.length === 0) {
      this.isShowingDialogue = false;
      if (this.els.storyOverlay) {
        this.els.storyOverlay.classList.add('hidden');
      }
      return;
    }
    
    const line = this.dialogueQueue.shift();
    if (this.els.storyText) {
      this.els.storyText.innerHTML = '';
      this.typeText(this.els.storyText, line, 0);
    }
    this.audio?.playClick(); // simple beep for dialogue
  }

  typeText(element, text, index) {
    if (!this.isShowingDialogue) return; // aborted
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      setTimeout(() => this.typeText(element, text, index + 1), 30);
    }
  }

  onChatSend = null; // set by app.js

  destroy() {
    if (this.stopAmbient) this.stopAmbient();
    if (this.minimapLoop) cancelAnimationFrame(this.minimapLoop);
  }
}
