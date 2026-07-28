import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PhysicsEngine } from './physics.js';
import { WorldGenerator } from './world_generator.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Game3D {
  constructor(canvasContainer, engine = null) {
    this.container = canvasContainer;
    this.engine = engine;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Objects
    this.character = null;
    this.characterParts = {};
    this.terrain = null;
    this.waterMeshes = [];
    this.particles = {
      fireflies: [],
      leaves: []
    };
    this.instancedMeshes = [];
    this.entityMeshes = {}; // Map of entity id to Three.js Mesh
    
    // State
    this.clock = new THREE.Clock();
    this.currentBiome = 'forest';
    this.cameraMode = 'follow'; // 'follow', 'orbit', 'top'
    this.onBiomeChange = null;
    
    // Logic
    this.isMoving = false;
    this.physics = null;
    this.worldGen = null;
    this.characterBody = null;
    this.moveSpeed = 8;
    this.runSpeed = 16;
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false
    };
    
    // Animation state
    this.walkCycle = 0;
    this.time = 0;

    // Partner avatar (multiplayer) — see spawnPartner/updatePartnerTransform
    this.partner = null;
    this.partnerParts = null;
    this.partnerCharId = null;
    this.partnerTarget = { x: 2, z: 2, rotY: 0 };
    this.partnerMoving = false;
    this.partnerRunning = false;
    this.partnerWalkCycle = 0;

    // Outgoing position broadcast (set by app.js): onLocalMove(x, z, rotY, moving, running)
    this.onLocalMove = null;
    this._moveSendAccum = 0;
    this._moveSendInterval = 0.1; // 10Hz — plenty smooth for a WebRTC data channel, low bandwidth
    this._lastSentMoving = null;
    
    // Camera state
    this.cameraTarget = new THREE.Vector3();
    this.cameraCurrentPos = new THREE.Vector3();
    this.orbitAngle = 0;
    this.orbitDistance = 15;
    this.isOrbiting = false;
    this.lastMouseX = 0;
    
    // Biome boundaries
    this.worldSize = 1000;
  }

  init() {
    // 1. Setup Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 6, 10);

    // 3. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    // Fog for Atmosphere
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    // 2. Physics & World Generation
    this.physics = new PhysicsEngine();
    this.worldGen = new WorldGenerator(this.scene, this.physics);
    this.worldGen.update(0, 0); // Generate initial chunks

    // 3. Environment & Lighting
    // Bloom (torch + fireflies glow). Skipped on mobile — a bloom pass chains
    // several full-screen blur passes, which is a meaningful GPU cost on phone
    // hardware; not worth it against the mobile performance goals of this pass.
    this.isMobile = window.innerWidth < 769 || 'ontouchstart' in window;
    if (!this.isMobile) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
        0.5,  // strength (tuned dynamically for day/night in update())
        0.5,  // radius
        0.9   // threshold — high by default so daytime sky/terrain don't bloom
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass()); // applies tone mapping + color space, since intermediate render targets don't
    }

    // 4. Setup Lights
    this.ambientLight = new THREE.AmbientLight(0xffe4c4, 0.5);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7a3d, 0.4);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.dirLight.position.set(50, 80, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 4096;
    this.dirLight.shadow.mapSize.height = 4096;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 250;
    const d = 100;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Player Torch
    this.torchLight = new THREE.PointLight(0xffaa00, 0, 15);
    this.scene.add(this.torchLight);

    // 5. Build World
    // this.createVegetation(); // Temp disable for testing procedural terrain

    // 4. Character & Camera
    this.createCharacter();
    this.createParticles();
    this.createTorchGlow();

    // 5. Setup Controls & Events
    this.setupControls();
    window.addEventListener('resize', this.resize.bind(this));

    // 7. Start Loop
    this.renderer.setAnimationLoop(() => this.update());
  }

  createCharacter() {
    const charId = this.engine && this.engine.state.myCharacter ? this.engine.state.myCharacter : 'scientist';
    const { group, parts } = this.buildCharacterMesh(charId);
    this.character = group;
    this.characterParts = parts;

    // Initial position
    this.character.position.set(0, 0, 0);
    // Face forward
    this.character.add(this.body);

    this.scene.add(this.character);
    
    // Add Physics Body
    if (this.physics) {
      this.characterBody = this.physics.addPlayer(0.5, 1.5, 50);
      this.characterBody.position.set(0, 10, 0); // Drop from sky
    }
  }

  // Builds a character rig for the given preset without touching this.character —
  // used for both the local player (createCharacter) and the partner (spawnPartner),
  // so the two avatars are guaranteed to look/animate identically.
  buildCharacterMesh(charId) {
    const character = new THREE.Group();
    const parts = {}; // Store parts for animation

    let skinColor = 0xffb380;
    let shirtColor = 0x3b82f6;
    let pantsColor = 0x78350f;
    let hairColor = 0x4a2c0a;
    
    if (charId === 'scientist') {
      skinColor = 0xffe0bd; // Fair
      shirtColor = 0xd4c4a8; // Beige tunic
      pantsColor = 0x2d3748; // Dark gray pants
      hairColor = 0x86efac; // Light green (Senku style)
    } else if (charId === 'brawn') {
      skinColor = 0xdda15e; // Tan
      shirtColor = 0x991b1b; // Red tunic
      pantsColor = 0x451a03; // Dark brown pants
      hairColor = 0x291402; // Dark brown hair
    } else if (charId === 'scout') {
      skinColor = 0xffe4c4; // Fair
      shirtColor = 0x2563eb; // Blue tunic
      pantsColor = 0x1e3a8a; // Dark blue skirt/pants
      hairColor = 0xfde047; // Blonde hair
    }

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Body (anchor point at bottom center of torso)
    const bodyGeo = new THREE.BoxGeometry(1.0, 1.2, 0.6);
    const body = new THREE.Mesh(bodyGeo, shirtMat);
    body.position.y = 1.5; // Offset from ground (legs are ~0.9)
    body.castShadow = true;
    character.add(body);
    parts.body = body;

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.6 + 0.5; // Half body height + half head height
    body.add(headGroup);
    
    const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    headGroup.add(head);
    parts.headGroup = headGroup;

    // Hair (Custom based on character)
    let hairGeo;
    if (charId === 'scientist') {
      // Tall spiky hair
      hairGeo = new THREE.ConeGeometry(0.8, 1.5, 5);
      hairGeo.translate(0, 0.75, 0);
    } else if (charId === 'brawn') {
      // Short flat/spiky
      hairGeo = new THREE.BoxGeometry(1.1, 0.4, 1.1);
      hairGeo.translate(0, 0.2, 0);
    } else {
      // Scout (longer back)
      hairGeo = new THREE.BoxGeometry(1.1, 0.3, 1.3);
      hairGeo.translate(0, 0.15, -0.1);
    }
    
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.5; // Top of head
    headGroup.add(hair);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.25, 0.1, 0.5);
    headGroup.add(eyeL);
    
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.25, 0.1, 0.5);
    headGroup.add(eyeR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
    armGeo.translate(0, -0.4, 0); // Pivot at top (shoulder)
    
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.65, 0.5, 0);
    armL.castShadow = true;
    body.add(armL);
    parts.armL = armL;
    
    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.65, 0.5, 0);
    armR.castShadow = true;
    body.add(armR);
    parts.armR = armR;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
    legGeo.translate(0, -0.45, 0); // Pivot at top (hip)
    
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.25, -0.6, 0);
    legL.castShadow = true;
    body.add(legL);
    parts.legL = legL;
    
    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.set(0.25, -0.6, 0);
    legR.castShadow = true;
    body.add(legR);
    parts.legR = legR;

    return { group: character, parts };
  }

  // Adds/updates the partner's avatar in the scene. Called when a
  // 'characterSelect' message arrives (see app.js). Rebuilds the mesh if the
  // partner switches character mid-game; otherwise a no-op.
  spawnPartner(charId) {
    if (this.partner && this.partnerCharId === charId) return;

    if (this.partner) {
      this.scene.remove(this.partner);
      this.partner = null;
      this.partnerParts = null;
    }

    const { group, parts } = this.buildCharacterMesh(charId);
    this.partnerCharId = charId;
    this.partner = group;
    this.partnerParts = parts;

    // Spawn a little offset from origin so the two avatars aren't fully
    // overlapping before the first 'move' packet arrives.
    this.partner.position.set(this.partnerTarget.x, 0, this.partnerTarget.z);
    this.partner.rotation.y = this.partnerTarget.rotY;
    this.scene.add(this.partner);
  }

  // Called from app.js whenever a 'move' packet arrives from the partner.
  // Stores the target transform; update() smoothly interpolates toward it
  // every frame so motion looks continuous between network ticks.
  updatePartnerTransform({ x, z, rotY, moving, running }) {
    this.partnerTarget.x = x;
    this.partnerTarget.z = z;
    this.partnerTarget.rotY = rotY;
    this.partnerMoving = !!moving;
    this.partnerRunning = !!running;
  }

  removePartner() {
    if (this.partner) {
      this.scene.remove(this.partner);
      this.partner = null;
      this.partnerParts = null;
      this.partnerCharId = null;
    }
  }

  createWater() {
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2563a8,
      transparent: true,
      opacity: 0.75,
      roughness: 0.15,
      metalness: 0.05 // near-zero: metalness needs an envMap to read as reflective; without one it just looks dark
    });

    // River (NE quadrant)
    const riverGeo = new THREE.PlaneGeometry(30, 500, 10, 50);
    riverGeo.rotateX(-Math.PI / 2);
    const river = new THREE.Mesh(riverGeo, waterMat);
    river.position.set(250, 0.2, -250);
    this.scene.add(river);
    this.waterMeshes.push(river);

    // Coast Ocean (SE quadrant bounds)
    const oceanGeo = new THREE.PlaneGeometry(600, 600, 20, 20);
    oceanGeo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(oceanGeo, waterMat);
    ocean.position.set(250, 0.1, 250);
    this.scene.add(ocean);
    this.waterMeshes.push(ocean);
  }

  createParticles() {
    // Fireflies
    const fireflyGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const fireflyMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });
    
    for (let i = 0; i < 30; i++) {
      const mesh = new THREE.Mesh(fireflyGeo, fireflyMat);
      mesh.position.set(
        -10 - Math.random() * 480,
        1 + Math.random() * 4,
        -10 - Math.random() * 480
      );
      this.scene.add(mesh);
      this.particles.fireflies.push({
        mesh,
        baseY: mesh.position.y,
        speed: 1 + Math.random(),
        offset: Math.random() * Math.PI * 2
      });
    }

    // Leaves
    const leafGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const leafColors = [0x22c55e, 0xeab308, 0xf97316];
    
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({ 
        color: leafColors[Math.floor(Math.random() * leafColors.length)],
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(leafGeo, mat);
      mesh.position.set(
        -10 - Math.random() * 80,
        5 + Math.random() * 10,
        -10 - Math.random() * 80
      );
      this.scene.add(mesh);
      this.particles.leaves.push({
        mesh,
        speedY: 1 + Math.random(),
        speedRot: 2 + Math.random() * 2,
        offset: Math.random() * Math.PI * 2
      });
    }
  }

  createTorchGlow() {
    const geo = new THREE.SphereGeometry(0.18, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.torchGlowMesh = new THREE.Mesh(geo, mat);
    this.torchGlowMesh.visible = false;
    this.scene.add(this.torchGlowMesh);
  }

  setupControls() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
        case 'KeyC': this.cycleCameraMode(); break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.run = true; break;
        case 'Space': case 'KeyF': this.handleAttack(); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.run = false; break;
      }
    });

    // Mobile attack button logic (we will hook it up in UI or handle here)
    // Actually, UI handles mobile buttons, so we just expose handleAttack()

    // Mouse for Orbit
    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 2 || this.cameraMode === 'orbit') { // Right click or orbit mode
        this.isOrbiting = true;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isOrbiting = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isOrbiting && this.cameraMode === 'orbit') {
        const deltaX = e.clientX - this.lastMouseX;
        this.orbitAngle -= deltaX * 0.01;
        this.lastMouseX = e.clientX;
      }
    });

    // Joystick Setup
    if (window.nipplejs && window.innerWidth < 769) {
      this.setupJoystick();
    }

    // Prevent context menu on right click
    this.container.addEventListener('contextmenu', e => e.preventDefault());
  }

  handleAttack() {
    if (!this.engine || !this.engine.entityManager) return;
    
    // Find closest entity within range (5 units)
    let closestId = null;
    let minDist = 5;
    
    const charPos = this.character.position;
    this.engine.entityManager.entities.forEach(ent => {
      const dx = ent.x - charPos.x;
      const dz = ent.z - charPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < minDist) {
        minDist = dist;
        closestId = ent.id;
      }
    });

    if (closestId !== null) {
      // Base damage 10, boosted by equipped weapons later
      let damage = 15;
      if (this.engine.hasItem('bronze_sword')) damage = 50;
      else if (this.engine.hasItem('spear')) damage = 35;
      else if (this.engine.hasItem('sharp_stone')) damage = 20;

      this.engine.attack(closestId, damage);
      
      // Visual feedback: simple scale punch
      const mesh = this.entityMeshes[closestId];
      if (mesh) {
        mesh.scale.set(1.2, 0.8, 1.2);
        setTimeout(() => mesh.scale.set(1, 1, 1), 150);
      }
    } else {
      // Swish air
      // this.engine.emit('log', { type: 'system', text: 'You swing at the air.' });
    }
  }

  setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    if (!zone) return;
    
    const manager = window.nipplejs.create({
      zone: zone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white'
    });

    manager.on('move', (evt, data) => {
      const angle = data.angle.degree;
      const force = data.force;
      
      // Reset keys
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;

      // Map joystick angle to WASD/Arrows
      if (force > 0.2) {
        if (angle > 45 && angle < 135) this.keys.forward = true;
        if (angle > 225 && angle < 315) this.keys.backward = true;
        if (angle >= 135 && angle <= 225) this.keys.left = true;
        if (angle <= 45 || angle >= 315) this.keys.right = true;
      }
    });

    manager.on('end', () => {
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
    });
  }

  cycleCameraMode() {
    const modes = ['follow', 'orbit', 'top'];
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length];
  }

  getTerrainHeight(x, z) {
    if (this.worldGen) {
      // Replicate the fBm logic from world_generator for entities and camera
      let y = 0;
      let amplitude = 10;
      let frequency = 0.01;
      for (let o = 0; o < 3; o++) {
        y += this.worldGen.noise2D(x * frequency, z * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      return y;
    }
    return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2 + Math.sin(x * 0.1 + z * 0.1) * 1;
  }

  detectBiome(x, z) {
    if (x < 0 && z < 0) return 'forest';
    if (x >= 0 && z < 0) return 'river';
    if (x < 0 && z >= 0) return 'cave';
    return 'coast';
  }

  update() {
    let dt = this.clock.getDelta();
    if (dt > 0.1) dt = 0.1; // clamp delta
    this.time += dt;

    if (this.physics) {
      this.physics.update(dt);
    }

    if (this.worldGen && this.character) {
      this.worldGen.update(this.character.position.x, this.character.position.z);
    }

    // --- PLAYER MOVEMENT (Physics) ---
    this.isMoving = false;
    let running = this.keys.run;

    if (this.characterBody) {
      const speed = running ? 15 : 8;
      
      // Calculate input direction
      const inputDir = new THREE.Vector3(0, 0, 0);
      if (this.keys.forward) inputDir.z -= 1;
      if (this.keys.backward) inputDir.z += 1;
      if (this.keys.left) inputDir.x -= 1;
      if (this.keys.right) inputDir.x += 1;
      
      if (inputDir.lengthSq() > 0) {
        inputDir.normalize();
        this.isMoving = true;
        
        // Face movement direction
        const targetRot = Math.atan2(inputDir.x, inputDir.z);
        
        // Smooth rotation
        let deltaRot = targetRot - this.character.rotation.y;
        deltaRot = ((deltaRot + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        this.character.rotation.y += deltaRot * Math.min(1, dt * 10);
        
        // Apply velocity (preserve Y velocity for gravity)
        this.characterBody.velocity.x = inputDir.x * speed;
        this.characterBody.velocity.z = inputDir.z * speed;
      } else {
        // Stop X/Z movement
        this.characterBody.velocity.x = 0;
        this.characterBody.velocity.z = 0;
      }

      // Sync visual mesh to physics body
      this.character.position.copy(this.characterBody.position);
      // character origin is center, visual might need offset
      this.character.position.y -= 0.75; 
      
      // Prevent falling out of world
      if (this.characterBody.position.y < -50) {
        this.characterBody.position.set(0, 10, 0);
        this.characterBody.velocity.set(0, 0, 0);
      }
    }

    // Biome check
    const newBiome = this.detectBiome(this.character.position.x, this.character.position.z);
    if (newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      if (this.onBiomeChange) this.onBiomeChange(this.currentBiome);
    }

    // --- ANIMATION ---
    if (this.isMoving) {
      // Walk cycle
      this.walkCycle += dt * (this.keys.run ? 15 : 10);
      const armSwing = Math.sin(this.walkCycle) * 0.5; // ~30 deg
      
      this.characterParts.armL.rotation.x = armSwing;
      this.characterParts.armR.rotation.x = -armSwing;
      this.characterParts.legL.rotation.x = -armSwing;
      this.characterParts.legR.rotation.x = armSwing;
      
      // Bobbing
      this.characterParts.body.position.y = 1.5 + Math.abs(Math.sin(this.walkCycle)) * 0.1;
    } else {
      // Idle
      this.walkCycle = 0;
      // Return to neutral
      this.characterParts.armL.rotation.x = THREE.MathUtils.lerp(this.characterParts.armL.rotation.x, 0, dt * 5);
      this.characterParts.armR.rotation.x = THREE.MathUtils.lerp(this.characterParts.armR.rotation.x, 0, dt * 5);
      this.characterParts.legL.rotation.x = THREE.MathUtils.lerp(this.characterParts.legL.rotation.x, 0, dt * 5);
      this.characterParts.legR.rotation.x = THREE.MathUtils.lerp(this.characterParts.legR.rotation.x, 0, dt * 5);
      
      // Gentle idle bob
      this.characterParts.body.position.y = 1.5 + Math.sin(this.time * 2) * 0.05;
    }

    // --- BROADCAST LOCAL POSITION (multiplayer) ---
    // Throttled to 10Hz regardless of frame rate — enough for smooth remote
    // interpolation without flooding the WebRTC data channel.
    this._moveSendAccum += dt;
    if (this.onLocalMove && this._moveSendAccum >= this._moveSendInterval) {
      this._moveSendAccum = 0;
      this.onLocalMove(
        this.character.position.x,
        this.character.position.z,
        this.character.rotation.y,
        this.isMoving,
        this.keys.run
      );
    }

    // --- PARTNER AVATAR (multiplayer) ---
    if (this.partner) {
      const followLerp = Math.min(1, dt * 8);
      this.partner.position.x = THREE.MathUtils.lerp(this.partner.position.x, this.partnerTarget.x, followLerp);
      this.partner.position.z = THREE.MathUtils.lerp(this.partner.position.z, this.partnerTarget.z, followLerp);
      this.partner.position.y = this.getTerrainHeight(this.partner.position.x, this.partner.position.z);

      // Shortest-path rotation lerp so it doesn't spin the long way around at the wrap point
      let deltaRot = this.partnerTarget.rotY - this.partner.rotation.y;
      deltaRot = ((deltaRot + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      this.partner.rotation.y += deltaRot * followLerp;

      if (this.partnerMoving) {
        this.partnerWalkCycle += dt * (this.partnerRunning ? 15 : 10);
        const armSwing = Math.sin(this.partnerWalkCycle) * 0.5;
        this.partnerParts.armL.rotation.x = armSwing;
        this.partnerParts.armR.rotation.x = -armSwing;
        this.partnerParts.legL.rotation.x = -armSwing;
        this.partnerParts.legR.rotation.x = armSwing;
        this.partnerParts.body.position.y = 1.5 + Math.abs(Math.sin(this.partnerWalkCycle)) * 0.1;
      } else {
        this.partnerWalkCycle = 0;
        this.partnerParts.armL.rotation.x = THREE.MathUtils.lerp(this.partnerParts.armL.rotation.x, 0, dt * 5);
        this.partnerParts.armR.rotation.x = THREE.MathUtils.lerp(this.partnerParts.armR.rotation.x, 0, dt * 5);
        this.partnerParts.legL.rotation.x = THREE.MathUtils.lerp(this.partnerParts.legL.rotation.x, 0, dt * 5);
        this.partnerParts.legR.rotation.x = THREE.MathUtils.lerp(this.partnerParts.legR.rotation.x, 0, dt * 5);
        this.partnerParts.body.position.y = 1.5 + Math.sin(this.time * 2) * 0.05;
      }
    }

    // --- CAMERA ---
    let targetCamPos = new THREE.Vector3();
    const charPos = this.character.position.clone();
    charPos.y += 1.5; // Look at center of character

    if (this.cameraMode === 'follow') {
      // Position behind character
      const offset = new THREE.Vector3(0, 5, -8);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.character.rotation.y);
      targetCamPos.copy(charPos).sub(offset);
      this.cameraTarget.copy(charPos);
    } 
    else if (this.cameraMode === 'orbit') {
      targetCamPos.set(
        charPos.x + Math.sin(this.orbitAngle) * this.orbitDistance,
        charPos.y + 6,
        charPos.z + Math.cos(this.orbitAngle) * this.orbitDistance
      );
      this.cameraTarget.copy(charPos);
    }
    else if (this.cameraMode === 'top') {
      targetCamPos.set(charPos.x, charPos.y + 20, charPos.z);
      this.cameraTarget.copy(charPos);
      this.cameraTarget.z -= 0.1; // slight offset so it knows which way is up
    }

    // Smooth lerp camera position
    this.camera.position.lerp(targetCamPos, dt * 5);
    this.camera.lookAt(this.cameraTarget);

    // --- WATER WAVES ---
    // NOTE: geometry.rotateX(-PI/2) was baked into these planes at creation time,
    // which moves world-up into the local Y axis and leaves the plane's long
    // axis in local Z. Animating Z (as this used to do) overwrote that long-axis
    // span with a tiny +-0.1 value every frame, collapsing the whole mesh into
    // a near-zero-width sliver. Y is the correct axis to perturb for a vertical wave.
    this.waterMeshes.forEach((mesh, idx) => {
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const wave = Math.sin(x * 0.4 + this.time * 1.6 + idx) * 0.12
                    + Math.sin(z * 0.25 - this.time * 1.1 + idx * 2) * 0.08;
        positions.setY(i, wave);
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals(); // keep lighting responsive to the waves
    });

    // --- PARTICLES ---
    this.particles.fireflies.forEach(p => {
      p.mesh.position.y = p.baseY + Math.sin(this.time * p.speed + p.offset) * 0.5;
      p.mesh.position.x += Math.sin(this.time * p.speed * 0.5 + p.offset) * 0.02;
      p.mesh.position.z += Math.cos(this.time * p.speed * 0.5 + p.offset) * 0.02;
    });

    this.particles.leaves.forEach(p => {
      p.mesh.position.y -= p.speedY * dt;
      p.mesh.rotation.y += p.speedRot * dt;
      p.mesh.rotation.z += p.speedRot * dt * 0.5;
      p.mesh.position.x += Math.sin(this.time + p.offset) * 0.05;
      
      if (p.mesh.position.y < 0) {
        p.mesh.position.y = 15;
      }
    });

    // --- ENTITIES ---
    if (this.engine) {
      // Logic update
      this.engine.update(dt, this.character.position.x, this.character.position.z);
      
      // Rendering update
      const activeEntities = this.engine.entityManager.entities;
      const activeIds = new Set(activeEntities.map(e => e.id));
      
      // Remove dead/despawned entities
      for (const id in this.entityMeshes) {
        if (!activeIds.has(Number(id))) {
          this.scene.remove(this.entityMeshes[id]);
          delete this.entityMeshes[id];
        }
      }

      // Update / Create
      activeEntities.forEach(ent => {
        let mesh = this.entityMeshes[ent.id];
        if (!mesh) {
          // Create simple box for animal
          const geo = new THREE.BoxGeometry(0.8, 0.8, 1.2);
          let color = 0x8b4513; // brown for deer/boar
          if (ent.type === 'bear') color = 0x3d1c00;
          if (ent.type === 'duck') color = 0x008000;
          
          const mat = new THREE.MeshStandardMaterial({ color });
          mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.scene.add(mesh);
          this.entityMeshes[ent.id] = mesh;
          
          // Add emoji label (optional, could just rely on shape)
        }
        
        // Lerp position for smoothness (or just set directly since AI runs locally)
        mesh.position.x = ent.x;
        mesh.position.z = ent.z;
        mesh.position.y = this.getTerrainHeight(ent.x, ent.z) + 0.4; // half height
        
        // Smooth rotation
        let deltaRot = ent.rotY - mesh.rotation.y;
        deltaRot = ((deltaRot + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        mesh.rotation.y += deltaRot * Math.min(1, dt * 5);
        
        // Walk bobbing
        if (ent.state !== 'idle') {
          mesh.position.y += Math.abs(Math.sin(this.time * (ent.state === 'flee' ? 15 : 8))) * 0.2;
        }
      });
    }

    // --- DAY / NIGHT CYCLE ---
    if (this.engine) {
      const timeOfDay = this.engine.state.timeOfDay || 0; // 0 to 1
      const isNight = timeOfDay > 0.7 || timeOfDay < 0.3;
      
      // Calculate sun position based on timeOfDay (0.0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight)
      const sunAngle = timeOfDay * Math.PI * 2;
      
      const sunHeight = Math.sin(sunAngle);
      const sunIntensity = Math.max(0, sunHeight * 1.5);
      
      this.dirLight.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        50
      );
      this.dirLight.intensity = sunIntensity;
      
      // Ambient/Hemi lighting adjusts based on sun height
      const ambientIntensity = 0.1 + Math.max(0, sunHeight * 0.4);
      this.ambientLight.intensity = ambientIntensity;
      this.hemiLight.intensity = ambientIntensity;

      // Sky and Fog color transition
      const skyDay = new THREE.Color(0x87CEEB);
      const skyNight = new THREE.Color(0x0a0a1a);
      const skySunset = new THREE.Color(0xff7e47);
      
      let skyColor = new THREE.Color();
      if (sunHeight > 0.2) skyColor.copy(skyDay);
      else if (sunHeight > 0.0) skyColor.copy(skySunset).lerp(skyDay, sunHeight / 0.2);
      else if (sunHeight > -0.2) skyColor.copy(skyNight).lerp(skySunset, (sunHeight + 0.2) / 0.2);
      else skyColor.copy(skyNight);
      
      this.scene.background = skyColor;
      this.scene.fog.color = skyColor;

      // Player Torch (if they have fire or lamp)
      const hasLamp = this.engine.state.inventory['electric_lamp'] > 0;
      const hasFire = this.engine.state.inventory['fire'] > 0;
      
      if (isNight && (hasLamp || hasFire)) {
        this.torchLight.intensity = hasLamp ? 2 : 1;
        this.torchLight.color.setHex(hasLamp ? 0xffffee : 0xffaa00);
        this.torchLight.distance = hasLamp ? 25 : 15;
        this.torchLight.position.copy(charPos);
        this.torchLight.position.y += 2;

        if (this.torchGlowMesh) {
          this.torchGlowMesh.visible = true;
          this.torchGlowMesh.position.copy(this.torchLight.position);
          this.torchGlowMesh.material.color.setHex(hasLamp ? 0xffffee : 0xffaa00);
        }
      } else {
        this.torchLight.intensity = 0;
        if (this.torchGlowMesh) this.torchGlowMesh.visible = false;
      }

      // Bloom reads as atmospheric glow at night (torch + fireflies against a
      // dark sky); kept subtle and high-threshold in daylight so the bright
      // sky/terrain don't blow out.
      if (this.bloomPass) {
        const targetStrength = isNight ? 0.8 : 0.12;
        const targetThreshold = isNight ? 0.55 : 0.92;
        this.bloomPass.strength = THREE.MathUtils.lerp(this.bloomPass.strength, targetStrength, dt * 2);
        this.bloomPass.threshold = THREE.MathUtils.lerp(this.bloomPass.threshold, targetThreshold, dt * 2);
      }
    }

    // Render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    if (this.composer) this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    // basic cleanup...
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
  }
}

export default Game3D;
