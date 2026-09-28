import * as THREE from 'three';

/**
 * Lighting setup for PlayroomEnvironment.
 * Directs sun rays through the arched window on the back-right,
 * with warm honey-oak bounce and gentle ambient fill.
 */
export class EnvironmentLights {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    this.quality = quality;
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = 'playroom_environment_lights';
    this.lightsGroup.userData.isEnvironment = true;

    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;
    this.frontFill = null;

    this.build();
    this.scene.add(this.lightsGroup);
  }

  build() {
    // 1. Main warm sunlight from upper right window
    this.sunLight = new THREE.DirectionalLight(0xfff6e6, 2.0);
    this.sunLight.position.set(10, 14, 4);
    this.sunLight.target.position.set(0.2, 0.4, 0.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 35;
    this.sunLight.shadow.camera.left = -12;
    this.sunLight.shadow.camera.right = 12;
    this.sunLight.shadow.camera.top = 12;
    this.sunLight.shadow.camera.bottom = -12;
    this.sunLight.shadow.radius = 2.5; // Soft shadow edges
    this.sunLight.userData.isEnvironment = true;

    this.lightsGroup.add(this.sunLight);
    this.lightsGroup.add(this.sunLight.target);

    // 2. Ambient room fill to soften unlit faces
    this.hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x854d0e, 1.1);
    this.hemiLight.userData.isEnvironment = true;
    this.lightsGroup.add(this.hemiLight);
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
    this.sunLight.shadow.camera.far = 40.0;
    this.sunLight.shadow.camera.left = -12.0;
    this.sunLight.shadow.camera.right = 12.0;
    this.sunLight.shadow.camera.top = 12.0;
    this.sunLight.shadow.camera.bottom = -12.0;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.radius = this.quality === 'high' ? 3.0 : 1.5;
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
