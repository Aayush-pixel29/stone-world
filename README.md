# Stone World 🌍 ⛏️

**Stone World** is a multiplayer, browser-based 3D survival game where you rebuild civilization from the ground up using real science. Starting from the Stone Age, players gather resources, craft tools, and progress through technological eras to reach the Industrial Revolution and beyond.

## Features ✨

*   **Infinite Procedural World**: Explore an endless, procedurally generated world built with SimplexNoise. Discover diverse biomes including Forests, Rivers, Caves, Coasts, Mountains, and Deserts.
*   **True Rigid-Body Physics**: The world isn't just for looking at—it's fully physical. Powered by `cannon-es`, players and entities interact with realistic collisions, gravity, and velocities.
*   **Hyper-Realistic Graphics**: Built with Three.js, featuring physically-based rendering (PBR), dynamic day/night cycles, volumetric fog, dynamic lighting, and post-processing bloom.
*   **Deep Crafting System**: Master real-world chemistry and engineering. Craft fire from friction, smelt bronze in a kiln, synthesize Nital, and construct a steam engine.
*   **Wildlife & Ecosystem**: Hunt roaming animals like deer, bears, and boars. But be careful—they will react to your presence!
*   **Multiplayer Capabilities**: Connect with friends via WebRTC to survive and rebuild civilization together.
*   **Dynamic Audio Engine**: A procedurally generated soundtrack that evolves as your civilization advances, moving from tribal drums in the Stone Age to complex melodies in the Electrical Age.

## Tech Stack 🛠️

*   **Graphics**: [Three.js](https://threejs.org/) (WebGL)
*   **Physics**: [cannon-es](https://pmndrs.github.io/cannon-es/)
*   **World Generation**: [simplex-noise](https://github.com/jwagner/simplex-noise.js)
*   **Networking**: WebRTC (Peer-to-peer multiplayer)
*   **Audio**: Web Audio API (Procedural Synthesis)

## How to Play 🚀

Since Stone World runs entirely in the browser using ES Modules, you just need a local web server to play it.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Aayush-pixel29/stone-world.git
    cd stone-world
    ```

2.  **Start a local server:**
    If you have Node.js installed, you can use `serve`:
    ```bash
    npx serve .
    ```
    Or if you have Python installed:
    ```bash
    python -m http.server 8080
    ```

3.  **Open in your browser:**
    Navigate to `http://localhost:3000` (or whichever port your server started on).

## Gameplay Guide 🎮

*   **Movement**: Use `W`, `A`, `S`, `D` or the `Arrow Keys`. Hold `Shift` to run.
*   **Camera**: Press `C` to cycle between Third-Person Follow, Orbit, and Top-Down camera modes.
*   **Interact / Attack**: Press `Spacebar` or `F`.
*   **Inventory & Crafting**: Use the on-screen UI buttons to manage your inventory, explore for resources, and craft new technologies.

## Story & Objectives 📜

Guided by the brilliant Dr. Aris, your goal is to fast-track humanity's progress. You awaken 3,700 years after a mysterious event petrified the world. Using the power of science (ten billion percent pure logic!), you will unlock new technological eras:

1.  **Stone Age**: Gather sticks and create fire.
2.  **Bronze Age**: Build a kiln and smelt copper/tin.
3.  **Iron Age**: Forge strong tools to master mechanics.
4.  **Electrical Age**: Capture lightning in a bottle and build an electric lamp.
5.  **Industrial Age**: Extract crude oil, synthesize plastic, and build a steam engine.

Can you rebuild a kingdom of science?

## License

This project is open-source and available for educational and recreational purposes.
