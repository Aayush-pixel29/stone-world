/**
 * Stone World — Core Game Engine
 * 
 * Manages all game state: inventory, world, crafting, exploration.
 * The engine is a "dumb validator" — it checks player combinations against
 * real-world chemical/physical reactions. Players must provide the brainpower.
 */

import { REACTIONS, PROCESSES } from './reactions.js';
import { BIOMES, ITEMS } from './world.js';

// ─── Constants ───────────────────────────────────────────────────────
const EXPLORE_COOLDOWN = 3000; // ms between explorations
const DAY_LENGTH = 300000;     // 5 minutes per day cycle
const MAX_INVENTORY_STACK = 99;
const SAVE_KEY = 'stoneworld_save';

// ─── Game State Shape ────────────────────────────────────────────────
function createDefaultState() {
  return {
    inventory: {},          // { item_id: quantity }
    discoveredItems: [],    // item IDs the player has ever seen
    discoveredReactions: [],// indices into REACTIONS array
    sharedChest: {},        // { item_id: quantity } — multiplayer shared storage
    currentBiome: null,
    exploredBiomes: [],     // biomes visited at least once
    dayCount: 1,
    timeOfDay: 0,           // 0.0 to 1.0 (0 = dawn, 0.5 = dusk, 1.0 = dawn again)
    gameStarted: false,
    tier: 0,                // highest tier unlocked
    totalCrafts: 0,
    totalFailures: 0,
    craftSlots: [null, null, null], // items currently in crafting bench
    selectedProcess: 'mix',
    myCharacter: 'scientist',
    partnerCharacter: null,
  };
}

// ─── Game Engine ─────────────────────────────────────────────────────
export class GameEngine {
  constructor() {
    this.state = createDefaultState();
    this.listeners = {};        // event listeners
    this.lastExploreTime = 0;
    this.dayTimer = null;
    this.playerName = 'You';
    this.partnerName = 'Partner';
  }

  // ─── Event System ──────────────────────────────────────────────────
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }

  // ─── Initialization ───────────────────────────────────────────────
  startGame(loadSave = true) {
    if (loadSave) {
      const saved = this.loadGame();
      if (saved) {
        this.state = { ...createDefaultState(), ...saved };
        this.emit('log', {
          type: 'system',
          text: 'Your consciousness stirs... memories of a petrified world return.',
        });
        this.emit('log', {
          type: 'system',
          text: `Day ${this.state.dayCount}. Your journey continues.`,
        });
        this.emit('stateChange', this.state);
        this.startDayCycle();
        return;
      }
    }

    this.state = createDefaultState();
    this.state.gameStarted = true;
    this.state.currentBiome = 'forest';
    this.state.exploredBiomes = ['forest'];

    // Opening narration
    const narration = [
      'The year is 5738.',
      'Your stone casing cracks. Light floods in.',
      'You gasp — the first breath in millennia.',
      'The world around you is silent. Petrified. Still.',
      'But you are alive. And you remember... everything.',
      'A forest stretches before you. No tools. No shelter. Nothing.',
      'You must rebuild civilization from scratch.',
      '— Use real science. Think. Experiment. Survive. —',
    ];

    narration.forEach((text, i) => {
      setTimeout(() => {
        this.emit('log', { type: 'system', text });
      }, i * 800);
    });

    setTimeout(() => {
      this.emit('log', {
        type: 'discovery',
        text: '🗺️ Tip: Click a biome on the map to explore and gather resources.',
      });
      this.emit('stateChange', this.state);
    }, narration.length * 800);

    this.startDayCycle();
    this.autoSave();
  }

  startDayCycle() {
    if (this.dayTimer) clearInterval(this.dayTimer);
    const tickInterval = DAY_LENGTH / 100;
    this.dayTimer = setInterval(() => {
      this.state.timeOfDay += 0.01;
      if (this.state.timeOfDay >= 1.0) {
        this.state.timeOfDay = 0;
        this.state.dayCount++;
        this.emit('log', {
          type: 'system',
          text: `☀️ Day ${this.state.dayCount} dawns.`,
        });
        this.autoSave();
      }
      this.emit('timeChange', {
        timeOfDay: this.state.timeOfDay,
        dayCount: this.state.dayCount,
        isNight: this.state.timeOfDay > 0.35 && this.state.timeOfDay < 0.85,
      });
    }, tickInterval);
  }

  // ─── Inventory Management ─────────────────────────────────────────
  addItem(itemId, qty = 1) {
    if (!ITEMS[itemId]) {
      console.warn(`Unknown item: ${itemId}`);
      return false;
    }
    if (!this.state.inventory[itemId]) {
      this.state.inventory[itemId] = 0;
    }
    this.state.inventory[itemId] = Math.min(
      this.state.inventory[itemId] + qty,
      MAX_INVENTORY_STACK
    );

    // Track discovery
    if (!this.state.discoveredItems.includes(itemId)) {
      this.state.discoveredItems.push(itemId);
      this.emit('newDiscovery', { itemId, item: ITEMS[itemId] });
    }

    this.emit('inventoryChange', this.state.inventory);
    return true;
  }

  removeItem(itemId, qty = 1) {
    if (!this.state.inventory[itemId] || this.state.inventory[itemId] < qty) {
      return false;
    }
    this.state.inventory[itemId] -= qty;
    if (this.state.inventory[itemId] <= 0) {
      delete this.state.inventory[itemId];
    }
    this.emit('inventoryChange', this.state.inventory);
    return true;
  }

  hasItem(itemId, qty = 1) {
    return (this.state.inventory[itemId] || 0) >= qty;
  }

  getInventory() {
    return { ...this.state.inventory };
  }

  // ─── Shared Chest (Multiplayer) ────────────────────────────────────
  addToChest(itemId, qty = 1) {
    if (!this.removeItem(itemId, qty)) return false;
    if (!this.state.sharedChest[itemId]) {
      this.state.sharedChest[itemId] = 0;
    }
    this.state.sharedChest[itemId] += qty;
    this.emit('chestChange', this.state.sharedChest);
    this.emit('log', {
      type: 'system',
      text: `📦 Placed ${qty}× ${ITEMS[itemId]?.name || itemId} in the shared chest.`,
    });
    return true;
  }

  takeFromChest(itemId, qty = 1) {
    if (!this.state.sharedChest[itemId] || this.state.sharedChest[itemId] < qty) {
      return false;
    }
    this.state.sharedChest[itemId] -= qty;
    if (this.state.sharedChest[itemId] <= 0) {
      delete this.state.sharedChest[itemId];
    }
    this.addItem(itemId, qty);
    this.emit('chestChange', this.state.sharedChest);
    this.emit('log', {
      type: 'system',
      text: `📦 Took ${qty}× ${ITEMS[itemId]?.name || itemId} from the shared chest.`,
    });
    return true;
  }

  // ─── Crafting Bench ────────────────────────────────────────────────
  setCraftSlot(slotIndex, itemId) {
    if (slotIndex < 0 || slotIndex > 2) return false;

    const currentItem = this.state.craftSlots[slotIndex];

    if (itemId === null) {
      if (currentItem) {
        this.addItem(currentItem, 1);
      }
      this.state.craftSlots[slotIndex] = null;
    } else {
      // Remove from inventory and place in slot
      if (!this.removeItem(itemId, 1)) return false;
      if (currentItem) {
        this.addItem(currentItem, 1);
      }
      this.state.craftSlots[slotIndex] = itemId;
    }

    this.emit('craftSlotsChange', this.state.craftSlots);
    return true;
  }

  clearCraftSlots() {
    // Return all items to inventory
    for (let i = 0; i < 3; i++) {
      if (this.state.craftSlots[i]) {
        this.addItem(this.state.craftSlots[i], 1);
        this.state.craftSlots[i] = null;
      }
    }
    this.emit('craftSlotsChange', this.state.craftSlots);
  }

  setProcess(process) {
    if (!PROCESSES[process]) return false;
    this.state.selectedProcess = process;
    this.emit('processChange', process);
    return true;
  }

  // ─── The Core: Blind Combine ───────────────────────────────────────
  craft() {
    const inputs = this.state.craftSlots.filter(Boolean).sort();
    const process = this.state.selectedProcess;

    if (inputs.length === 0) {
      this.emit('log', {
        type: 'fail',
        text: 'Place items in the crafting slots first.',
      });
      return { success: false, reason: 'empty' };
    }

    // Find matching reaction
    const reaction = this.findReaction(inputs, process);

    if (reaction) {
      // SUCCESS!
      this.state.totalCrafts++;

      // Clear slots (items are consumed)
      this.state.craftSlots = [null, null, null];

      // Add output
      this.addItem(reaction.output, reaction.outputQty || 1);

      // Track discovered reaction
      const reactionIndex = REACTIONS.indexOf(reaction);
      if (!this.state.discoveredReactions.includes(reactionIndex)) {
        this.state.discoveredReactions.push(reactionIndex);
      }

      // Update tier
      if (reaction.tier > this.state.tier) {
        this.state.tier = reaction.tier;
        this.emit('tierUp', { tier: this.state.tier });
        this.emit('log', {
          type: 'discovery',
          text: `⬆️ TIER ${this.state.tier} UNLOCKED! You've entered a new age of discovery.`,
        });
      }

      const outputItem = ITEMS[reaction.output];
      this.emit('craftSuccess', {
        reaction,
        outputItem,
        inputs,
        process,
      });
      this.emit('log', {
        type: 'craft',
        text: `⚗️ ${reaction.description}`,
      });
      if (reaction.science) {
        this.emit('log', {
          type: 'discovery',
          text: `📐 ${reaction.science}`,
        });
      }
      this.emit('craftSlotsChange', this.state.craftSlots);
      this.emit('stateChange', this.state);
      this.autoSave();

      return { success: true, reaction, outputItem };
    } else {
      // FAILURE — items are lost
      this.state.totalFailures++;
      this.state.craftSlots = [null, null, null];

      const itemNames = inputs.map(id => ITEMS[id]?.name || id).join(' + ');
      const processName = PROCESSES[process]?.name || process;

      this.emit('craftFail', { inputs, process });
      this.emit('log', {
        type: 'fail',
        text: `❌ ${processName}ing ${itemNames}... Nothing happens. Materials lost.`,
      });

      // Give a hint if player has failed a lot
      if (this.state.totalFailures % 5 === 0) {
        const hintReaction = this.getHintForTier(this.state.tier);
        if (hintReaction) {
          this.emit('log', {
            type: 'system',
            text: `💭 A faint memory: "${hintReaction.hint}"`,
          });
        }
      }

      this.emit('craftSlotsChange', this.state.craftSlots);
      this.emit('stateChange', this.state);
      return { success: false, reason: 'no_match' };
    }
  }

  findReaction(inputs, process) {
    const sortedInputs = [...inputs].sort();
    return REACTIONS.find(r => {
      if (r.process !== process) return false;
      const sortedReactionInputs = [...r.inputs].sort();
      if (sortedReactionInputs.length !== sortedInputs.length) return false;
      return sortedReactionInputs.every((item, i) => item === sortedInputs[i]);
    });
  }

  getHintForTier(tier) {
    // Find an undiscovered reaction at the current tier
    const undiscovered = REACTIONS.filter((r, i) => {
      return r.tier <= tier + 1 && !this.state.discoveredReactions.includes(i);
    });
    if (undiscovered.length === 0) return null;
    return undiscovered[Math.floor(Math.random() * undiscovered.length)];
  }

  // ─── Exploration ───────────────────────────────────────────────────
  explore(biomeId) {
    const now = Date.now();
    if (now - this.lastExploreTime < EXPLORE_COOLDOWN) {
      const remaining = Math.ceil((EXPLORE_COOLDOWN - (now - this.lastExploreTime)) / 1000);
      this.emit('log', {
        type: 'system',
        text: `⏳ You need to rest. Try again in ${remaining}s.`,
      });
      return { success: false, reason: 'cooldown' };
    }

    const biome = BIOMES[biomeId];
    if (!biome) {
      this.emit('log', { type: 'fail', text: 'Unknown location.' });
      return { success: false, reason: 'unknown_biome' };
    }

    this.lastExploreTime = now;
    this.state.currentBiome = biomeId;

    if (!this.state.exploredBiomes.includes(biomeId)) {
      this.state.exploredBiomes.push(biomeId);
      this.emit('log', {
        type: 'discovery',
        text: `🗺️ You discovered the ${biome.name}! ${biome.description}`,
      });
    }

    // Gather resources based on chance
    const found = [];
    biome.resources.forEach(resource => {
      if (Math.random() <= resource.chance) {
        const qty = Array.isArray(resource.qty)
          ? Math.floor(Math.random() * (resource.qty[1] - resource.qty[0] + 1)) + resource.qty[0]
          : resource.qty || 1;
        this.addItem(resource.id, qty);
        const item = ITEMS[resource.id];
        found.push({ id: resource.id, name: item?.name || resource.id, qty, emoji: item?.emoji || '❓' });
      }
    });

    if (found.length > 0) {
      const foundText = found.map(f => `${f.emoji} ${f.name} ×${f.qty}`).join(', ');
      this.emit('log', {
        type: 'discovery',
        text: `🔍 Explored the ${biome.name} and found: ${foundText}`,
      });
      this.emit('explore', { biomeId, found });
    } else {
      this.emit('log', {
        type: 'system',
        text: `🔍 You searched the ${biome.name} but found nothing useful this time.`,
      });
      this.emit('explore', { biomeId, found: [] });
    }

    this.emit('stateChange', this.state);
    this.autoSave();
    return { success: true, found };
  }

  // ─── Journal ───────────────────────────────────────────────────────
  getJournal() {
    return this.state.discoveredReactions.map(index => {
      const r = REACTIONS[index];
      if (!r) return null;
      const inputNames = r.inputs.map(id => ITEMS[id]?.name || id).join(' + ');
      const outputName = ITEMS[r.output]?.name || r.output;
      const processName = PROCESSES[r.process]?.name || r.process;
      return {
        inputs: inputNames,
        process: processName,
        output: outputName,
        science: r.science,
        tier: r.tier,
      };
    }).filter(Boolean);
  }

  // ─── Progress ──────────────────────────────────────────────────────
  getProgress() {
    const totalReactions = REACTIONS.length;
    const discovered = this.state.discoveredReactions.length;
    const totalItems = Object.keys(ITEMS).length;
    const discoveredItems = this.state.discoveredItems.length;
    const maxTier = Math.max(...REACTIONS.map(r => r.tier));

    return {
      reactionsDiscovered: discovered,
      reactionsTotal: totalReactions,
      reactionPercent: Math.round((discovered / totalReactions) * 100),
      itemsDiscovered: discoveredItems,
      itemsTotal: totalItems,
      currentTier: this.state.tier,
      maxTier,
      tierPercent: Math.round((this.state.tier / maxTier) * 100),
      dayCount: this.state.dayCount,
      totalCrafts: this.state.totalCrafts,
      totalFailures: this.state.totalFailures,
    };
  }

  // ─── Serialization ─────────────────────────────────────────────────
  serialize() {
    return JSON.parse(JSON.stringify(this.state));
  }

  deserialize(data) {
    this.state = { ...createDefaultState(), ...data };
    this.emit('stateChange', this.state);
    this.emit('inventoryChange', this.state.inventory);
    this.emit('craftSlotsChange', this.state.craftSlots);
    this.emit('chestChange', this.state.sharedChest);
  }

  // ─── Save / Load ──────────────────────────────────────────────────
  autoSave() {
    try {
      const data = this.serialize();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('AutoSave failed:', e);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Load failed:', e);
      return null;
    }
  }

  deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    this.emit('log', { type: 'system', text: '🗑️ Save data cleared.' });
  }

  newGame() {
    this.deleteSave();
    if (this.dayTimer) clearInterval(this.dayTimer);
    this.state = createDefaultState();
    this.startGame(false);
  }

  // ─── Multiplayer Helpers ───────────────────────────────────────────
  // These create action objects to be sent over WebRTC

  createCraftAction(reaction) {
    return {
      type: 'craft',
      payload: {
        player: this.playerName,
        output: reaction.output,
        outputName: ITEMS[reaction.output]?.name || reaction.output,
        description: reaction.description,
      },
    };
  }

  createExploreAction(biomeId, found) {
    return {
      type: 'explore',
      payload: {
        player: this.playerName,
        biome: biomeId,
        biomeName: BIOMES[biomeId]?.name || biomeId,
        found: found.map(f => f.name),
      },
    };
  }

  createShareAction(itemId, qty) {
    return {
      type: 'share_item',
      payload: {
        player: this.playerName,
        itemId,
        itemName: ITEMS[itemId]?.name || itemId,
        qty,
      },
    };
  }

  // Handle action from partner
  handlePartnerAction(action) {
    switch (action.type) {
      case 'craft':
        this.emit('log', {
          type: 'partner',
          text: `🤝 ${action.payload.player} crafted ${action.payload.outputName}! "${action.payload.description}"`,
        });
        break;
      case 'explore':
        this.emit('log', {
          type: 'partner',
          text: `🤝 ${action.payload.player} explored the ${action.payload.biomeName} and found: ${action.payload.found.join(', ') || 'nothing'}.`,
        });
        break;
      case 'share_item':
        this.state.sharedChest[action.payload.itemId] =
          (this.state.sharedChest[action.payload.itemId] || 0) + action.payload.qty;
        this.emit('chestChange', this.state.sharedChest);
        this.emit('log', {
          type: 'partner',
          text: `🤝 ${action.payload.player} placed ${action.payload.qty}× ${action.payload.itemName} in the shared chest.`,
        });
        break;
      case 'chat':
        this.emit('chatMessage', {
          sender: action.payload.player,
          text: action.payload.text,
          isPartner: true,
        });
        break;
      case 'sync_state':
        // Sync shared chest from host
        if (action.payload.sharedChest) {
          this.state.sharedChest = action.payload.sharedChest;
          this.emit('chestChange', this.state.sharedChest);
        }
        break;
    }
  }

  // ─── Utility ───────────────────────────────────────────────────────
  getItemInfo(itemId) {
    return ITEMS[itemId] || null;
  }

  getBiomeInfo(biomeId) {
    return BIOMES[biomeId] || null;
  }

  getAllProcesses() {
    return PROCESSES;
  }

  getAllBiomes() {
    return BIOMES;
  }

  destroy() {
    if (this.dayTimer) clearInterval(this.dayTimer);
    this.listeners = {};
  }
}
