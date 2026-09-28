import * as THREE from 'three';

/**
 * homeLighting.js
 * 
 * Cinematic 3-point children's game lighting setup:
 * - KEY LIGHT: Warm directional sunlight streaming from the right arched window
 * - FILL LIGHT: Soft warm room illumination & ambient sky bounce
 * - RIM LIGHT: Subtle edge separation for characters and furniture
 * - POINT LIGHTS: Cozy interior warmth and fairy lights glow
 */
export class HomeLighting {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'home_lighting_group';
    this.group.userData.isEnvironment = true;

    this.time = 0;
    this.build();
    this.scene.add(this.group);
  }

  build() {
    // 1. Warm Ambient & Hemisphere Fill Light
    this.hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x93c5fd, 1.35);
    this.hemiLight.position.set(0, 10, 0);
    this.group.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffedd5, 0.85);
    this.group.add(this.ambientLight);

    // 2. Key Light: Warm Golden Sunlight entering from the Arched Window (Right side)
    this.sunLight = new THREE.DirectionalLight(0xfff3d1, 2.4);
    this.sunLight.position.set(11.0, 9.5, -3.5);
    this.sunLight.target.position.set(-0.5, 1.2, 0.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 28;
    this.sunLight.shadow.camera.left = -7.5;
    this.sunLight.shadow.camera.right = 7.5;
    this.sunLight.shadow.camera.top = 7.5;
    this.sunLight.shadow.camera.bottom = -7.5;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.radius = 2.5; // Soft shadow edges
    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);

    // 3. Rim / Back Light: Subtle separation behind characters
    this.rimLight = new THREE.DirectionalLight(0xbfe0ff, 0.95);
    this.rimLight.position.set(-8.0, 7.0, -8.0);
    this.rimLight.target.position.set(0, 1.0, 1.0);
    this.group.add(this.rimLight);
    this.group.add(this.rimLight.target);

    // 4. Front Soft Fill Light for character faces & rug
    this.frontFill = new THREE.DirectionalLight(0xfffbf0, 0.8);
    this.frontFill.position.set(0, 3.2, 8.5);
    this.group.add(this.frontFill);

    // 5. Cozy Warm Point Light in Playroom Corner
    this.cozyPointLight = new THREE.PointLight(0xffba7a, 1.1, 16, 1.4);
    this.cozyPointLight.position.set(-4.5, 4.0, -0.5);
    this.group.add(this.cozyPointLight);
  }

  update(delta) {
    this.time += delta;
    // Subtle organic breathing of the sunlight warmth
    if (this.sunLight) {
      this.sunLight.intensity = 2.35 + Math.sin(this.time * 1.2) * 0.08;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
