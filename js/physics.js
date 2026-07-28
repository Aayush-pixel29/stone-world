import * as CANNON from 'cannon-es';

export class PhysicsEngine {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.81, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 10;
    
    // Physics materials
    this.defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.1,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
  }

  update(dt) {
    this.world.step(1/60, dt, 3);
  }

  addPlayer(radius, height, mass) {
    const shape = new CANNON.Cylinder(radius, radius, height, 16);
    // Cylinder is oriented along Z by default in cannon-es, often needs rotation for Y up.
    // We'll rotate the shape when adding it to the body.
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    
    const body = new CANNON.Body({
      mass: mass,
      material: this.defaultMaterial,
      fixedRotation: true
    });
    body.addShape(shape, new CANNON.Vec3(0, 0, 0), quaternion);
    this.world.addBody(body);
    return body;
  }

  addHeightfield(matrixData, position, elementSize) {
    const shape = new CANNON.Heightfield(matrixData, {
      elementSize: elementSize
    });
    // Heightfield requires rotation in cannon-es to map correctly from XY to XZ plane
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    
    const body = new CANNON.Body({
      mass: 0, // static
      material: this.defaultMaterial
    });
    body.addShape(shape, new CANNON.Vec3(0, 0, 0), quaternion);
    body.position.copy(position);
    this.world.addBody(body);
    return body;
  }

  addBox(width, height, depth, mass, position) {
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({
      mass: mass,
      material: this.defaultMaterial
    });
    body.addShape(shape);
    if (position) {
      body.position.copy(position);
    }
    this.world.addBody(body);
    return body;
  }
}
