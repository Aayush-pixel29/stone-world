import { ANIMALS, BIOMES } from './world.js';

export class EntityManager {
  constructor(engine) {
    this.engine = engine;
    this.entities = []; // List of active entities
    this.nextId = 1;
    this.worldSize = 1000; // Match game3d bounds
  }

  init() {
    this.spawnInitialWildlife();
  }

  // Initial population
  spawnInitialWildlife() {
    // Spawn about 40 animals across the map
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * this.worldSize;
      const z = (Math.random() - 0.5) * this.worldSize;
      
      const biomeId = this.detectBiome(x, z);
      const biomeInfo = BIOMES[biomeId];
      if (!biomeInfo || !biomeInfo.animals || biomeInfo.animals.length === 0) continue;
      
      const animalId = biomeInfo.animals[Math.floor(Math.random() * biomeInfo.animals.length)];
      
      this.spawnEntity(animalId, x, z);
    }
  }

  spawnEntity(animalId, x, z) {
    const template = ANIMALS[animalId];
    if (!template) return;

    const entity = {
      id: this.nextId++,
      type: animalId,
      name: template.name,
      hp: template.hp,
      maxHp: template.hp,
      speed: template.speed,
      x: x,
      z: z,
      rotY: Math.random() * Math.PI * 2,
      state: 'idle', // idle, wander, flee
      stateTimer: 0,
      drops: template.drops
    };

    this.entities.push(entity);
    this.engine.emit('entitySpawned', entity);
  }

  detectBiome(x, z) {
    if (z < 0) {
      if (x < -166) return 'forest';
      if (x < 166) return 'mountain';
      return 'river';
    } else {
      if (x < -166) return 'cave';
      if (x < 166) return 'desert';
      return 'coast';
    }
  }

  update(dt, playerX, playerZ) {
    // Simple AI update for all entities
    this.entities.forEach(ent => {
      ent.stateTimer -= dt;

      // Distance to player
      const dx = playerX - ent.x;
      const dz = playerZ - ent.z;
      const distToPlayer = Math.sqrt(dx*dx + dz*dz);

      // Flee if close
      if (distToPlayer < 20) {
        ent.state = 'flee';
        ent.stateTimer = 2.0; // Flee for at least 2 seconds
        // Run away from player
        ent.rotY = Math.atan2(-dx, -dz); 
      }

      // State transitions
      if (ent.stateTimer <= 0) {
        if (ent.state === 'flee') {
          ent.state = 'idle';
          ent.stateTimer = Math.random() * 3 + 1;
        } else if (ent.state === 'idle') {
          ent.state = 'wander';
          ent.stateTimer = Math.random() * 4 + 2;
          ent.rotY = Math.random() * Math.PI * 2; // Pick new random direction
        } else if (ent.state === 'wander') {
          ent.state = 'idle';
          ent.stateTimer = Math.random() * 3 + 1;
        }
      }

      // Movement
      if (ent.state === 'wander') {
        ent.x += Math.sin(ent.rotY) * ent.speed * 0.3 * dt; // walk slow
        ent.z += Math.cos(ent.rotY) * ent.speed * 0.3 * dt;
      } else if (ent.state === 'flee') {
        ent.x += Math.sin(ent.rotY) * ent.speed * dt; // run fast
        ent.z += Math.cos(ent.rotY) * ent.speed * dt;
      }

      // Keep in bounds
      const halfBound = this.worldSize / 2 - 10;
      ent.x = Math.max(-halfBound, Math.min(halfBound, ent.x));
      ent.z = Math.max(-halfBound, Math.min(halfBound, ent.z));
    });
  }

  damageEntity(entityId, amount) {
    const ent = this.entities.find(e => e.id === entityId);
    if (!ent) return null;

    ent.hp -= amount;
    ent.state = 'flee';
    ent.stateTimer = 5.0; // Run for a long time when hit

    if (ent.hp <= 0) {
      // Handle death
      this.entities = this.entities.filter(e => e.id !== entityId);
      this.engine.emit('entityDied', ent);
      
      // Calculate drops
      const droppedItems = [];
      ent.drops.forEach(drop => {
        const qty = Math.floor(Math.random() * (drop.qty[1] - drop.qty[0] + 1)) + drop.qty[0];
        if (qty > 0) {
          droppedItems.push({ id: drop.id, qty });
          this.engine.addItem(drop.id, qty);
        }
      });
      return { died: true, drops: droppedItems, name: ent.name };
    }
    return { died: false };
  }
}
