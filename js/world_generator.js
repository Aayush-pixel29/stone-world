import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import * as CANNON from 'cannon-es';

export class WorldGenerator {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.noise2D = createNoise2D(); // Uses Math.random() by default
    this.chunks = new Map();
    this.chunkSize = 64; // Size of each chunk in units
    this.resolution = 32; // Vertices per chunk edge
  }

  update(playerX, playerZ) {
    // Determine which chunk the player is in
    const cx = Math.floor(playerX / this.chunkSize);
    const cz = Math.floor(playerZ / this.chunkSize);
    
    const loadRadius = 2;
    const activeChunks = new Set();
    
    // Generate new chunks
    for (let x = cx - loadRadius; x <= cx + loadRadius; x++) {
      for (let z = cz - loadRadius; z <= cz + loadRadius; z++) {
        const key = `${x},${z}`;
        activeChunks.add(key);
        
        if (!this.chunks.has(key)) {
          this.generateChunk(x, z, key);
        }
      }
    }
    
    // Remove out-of-bounds chunks
    for (const [key, mesh] of this.chunks.entries()) {
      if (!activeChunks.has(key)) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        if (mesh.physicsBody && this.physics) {
          this.physics.world.removeBody(mesh.physicsBody);
        }
        this.chunks.delete(key);
      }
    }
  }

  generateChunk(chunkX, chunkZ, key) {
    const geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, this.resolution, this.resolution);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();
    const matrixData = [];

    for (let i = 0; i < positions.count; i++) {
      // Calculate world coordinates for noise
      const px = positions.getX(i) + chunkX * this.chunkSize;
      const pz = positions.getZ(i) + chunkZ * this.chunkSize;

      // Fractional Brownian motion (fBm) with 3 octaves
      let y = 0;
      let amplitude = 10;
      let frequency = 0.01;
      for (let o = 0; o < 3; o++) {
        y += this.noise2D(px * frequency, pz * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      positions.setY(i, y);

      // Store height for cannon-es heightfield
      // Heightfield expects a 2D array [resolution][resolution]
      // Our plane has resolution+1 vertices per edge
      const col = i % (this.resolution + 1);
      const row = Math.floor(i / (this.resolution + 1));
      if (!matrixData[col]) matrixData[col] = [];
      matrixData[col][row] = y;

      // Height-based coloring
      if (y < -2) {
        color.setHex(0xe3d9ad); // Sand
      } else if (y < 8) {
        color.setHex(0x567d46); // Grass
      } else {
        color.setHex(0xffffff); // Snow
      }
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunkX * this.chunkSize, 0, chunkZ * this.chunkSize);
    
    this.scene.add(mesh);
    
    // Add physics body if physics engine is available
    if (this.physics) {
      // The element size is chunkSize / resolution
      const elementSize = this.chunkSize / this.resolution;
      
      // Cannon heightfield expects the matrix to be oriented differently.
      // And we need to center it or position it matching the THREE plane.
      // PlaneGeometry creates vertices centered at 0,0, but Heightfield starts from the origin and goes positive.
      // So position = chunk_center - half_size
      const pos = new CANNON.Vec3(
        chunkX * this.chunkSize - this.chunkSize/2,
        0,
        chunkZ * this.chunkSize + this.chunkSize/2
      );
      
      mesh.physicsBody = this.physics.addHeightfield(matrixData, pos, elementSize);
    }

    this.chunks.set(key, mesh);
  }
}
