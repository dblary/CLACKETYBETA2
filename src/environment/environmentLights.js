import * as THREE from 'three';

/**
 * Lighting setup for PlayroomEnvironment.
 * Directs warm cinematic sunlight through the arched window on the back-right,
 * with pastel sky-blue hemisphere ambient fill and soft corner accents.
 */
export class EnvironmentLights {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    this.quality = quality;
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = 'playroom_environment_lights';
    this.lightsGroup.userData.isEnvironment = true;

    this.sunLight = null;
    this.hemiLight = null;
    this.lampLight = null;

    this.build();
    this.scene.add(this.lightsGroup);
  }

  build() {
    // 1. Main warm sunlight angled through arched window at (18, 8.5, -39.58)
    this.sunLight = new THREE.DirectionalLight(0xfff6e5, 2.4);
    this.sunLight.position.set(24, 18, -32);
    this.sunLight.target.position.set(0, 0.5, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 70.0;
    this.sunLight.shadow.camera.left = -22.0;
    this.sunLight.shadow.camera.right = 22.0;
    this.sunLight.shadow.camera.top = 22.0;
    this.sunLight.shadow.camera.bottom = -22.0;
    this.sunLight.shadow.radius = 2.5; // Soft shadow edges
    this.sunLight.userData.isEnvironment = true;

    this.lightsGroup.add(this.sunLight);
    this.lightsGroup.add(this.sunLight.target);

    // 2. Soft Fill Light: Pastel sky-blue ambient/hemisphere light to keep shadows colorful and gentle
    this.hemiLight = new THREE.HemisphereLight(0xe8f4f8, 0xe0c39e, 1.1);
    this.hemiLight.userData.isEnvironment = true;
    this.lightsGroup.add(this.hemiLight);

    // 3. Cozy Wooden Floor Lamp Warm Glow in Back-Right Corner
    this.lampLight = new THREE.PointLight(0xffedd5, 1.2, 22, 1.8);
    this.lampLight.position.set(34.0, 5.2, -32.0);
    this.lampLight.castShadow = false;
    this.lampLight.userData.isEnvironment = true;
    this.lightsGroup.add(this.lampLight);
  }

  configureShadows() {
    if (!this.sunLight) return;

    if (this.quality === 'low') {
      this.sunLight.castShadow = false;
      return;
    }

    this.sunLight.castShadow = true;
    const mapSize = this.quality === 'high' ? 2048 : 1024;
    this.sunLight.shadow.mapSize.set(mapSize, mapSize);
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 70.0;
    this.sunLight.shadow.camera.left = -22.0;
    this.sunLight.shadow.camera.right = 22.0;
    this.sunLight.shadow.camera.top = 22.0;
    this.sunLight.shadow.camera.bottom = -22.0;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.radius = this.quality === 'high' ? 2.5 : 1.5;
  }

  setQuality(quality) {
    this.quality = quality;
    this.configureShadows();
  }

  dispose() {
    if (this.lightsGroup.parent) {
      this.lightsGroup.parent.remove(this.lightsGroup);
    }
  }
}
