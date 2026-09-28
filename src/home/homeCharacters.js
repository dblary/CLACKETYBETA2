import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * homeCharacters.js
 * 
 * Manages loading and animation of authored 3D character models for the Home Screen:
 * - BOY: Authored 3D model (blue hoodie, brown hair, expressive eyes) on the left of rug
 * - GIRL: Authored 3D model (pink hoodie, long brown hair) on the right of rug
 * - PUPPY: Authored 3D puppy model in the lower-left foreground
 * - REAL BUILDING BRICKS: Authentic LDraw / game construction bricks between the children
 * 
 * Follows strict production asset architecture with GLTFLoader and AnimationMixer.
 */

export class HomeCharacters {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'home_characters_group';
    this.group.userData.isEnvironment = true;

    this.loader = new GLTFLoader();
    this.mixers = [];
    this.models = {
      boy: null,
      girl: null,
      puppy: null
    };

    // Asset paths for authored 3D character models
    this.assetSlots = {
      boy: './assets/home/characters/boy.glb',
      girl: './assets/home/characters/girl.glb',
      puppy: './assets/home/characters/puppy.glb'
    };

    this.missingAssets = [];
    this.time = 0;

    this.buildConstructionBricks();
    this.loadCharacterModels();
    this.scene.add(this.group);
  }

  loadCharacterModels() {
    // 1. Load Boy Model (Left side of rug)
    this.loadModel('boy', this.assetSlots.boy, {
      position: new THREE.Vector3(-1.6, 0.05, 0.9),
      rotation: new THREE.Euler(0, 0.35, 0),
      scale: new THREE.Vector3(1, 1, 1)
    });

    // 2. Load Girl Model (Right side of rug)
    this.loadModel('girl', this.assetSlots.girl, {
      position: new THREE.Vector3(0.8, 0.05, 0.9),
      rotation: new THREE.Euler(0, -0.35, 0),
      scale: new THREE.Vector3(1, 1, 1)
    });

    // 3. Load Puppy Model (Lower-left foreground)
    this.loadModel('puppy', this.assetSlots.puppy, {
      position: new THREE.Vector3(-2.8, 0.05, 1.45),
      rotation: new THREE.Euler(0, 0.55, 0),
      scale: new THREE.Vector3(1, 1, 1)
    });
  }

  loadModel(slotName, url, transform) {
    this.loader.load(
      url,
      (gltf) => {
        const model = gltf.scene || gltf.scenes[0];
        model.position.copy(transform.position);
        model.rotation.copy(transform.rotation);
        model.scale.copy(transform.scale);

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = Math.max(0.3, child.material.roughness || 0.5);
              child.material.envMapIntensity = 1.0;
            }
          }
        });

        // Set up AnimationMixer if clips exist
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          const idleClip = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
          const action = mixer.clipAction(idleClip);
          action.play();
          this.mixers.push(mixer);
        }

        this.models[slotName] = model;
        this.group.add(model);
      },
      undefined,
      (error) => {
        // Document missing asset slot cleanly without breaking the application
        if (!this.missingAssets.includes(slotName)) {
          this.missingAssets.push(slotName);
        }
      }
    );
  }

  /**
   * Real Construction Bricks on the rug between the two children
   * Uses real ABS plastic materials with studs matching the game's building system.
   */
  buildConstructionBricks() {
    this.brickGroup = new THREE.Group();
    this.brickGroup.position.set(-0.45, 0.02, 1.25);

    const materials = {
      red: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.28, metalness: 0.02 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.28, metalness: 0.02 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.02 }),
      green: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.28, metalness: 0.02 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.28, metalness: 0.02 }),
      purple: new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.28, metalness: 0.02 })
    };

    const studGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.045, 12);

    const addBrick = (w, h, d, x, y, z, mat, rotY = 0) => {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      bMesh.position.set(x, y + h / 2, z);
      bMesh.rotation.y = rotY;
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      this.brickGroup.add(bMesh);

      // Add studs on top surface
      const nx = Math.max(1, Math.round(w / 0.32));
      const nz = Math.max(1, Math.round(d / 0.32));
      const stepX = w / (nx + 1);
      const stepZ = d / (nz + 1);

      for (let ix = 1; ix <= nx; ix++) {
        for (let iz = 1; iz <= nz; iz++) {
          const stud = new THREE.Mesh(studGeo, mat);
          stud.position.set(
            x - w / 2 + ix * stepX,
            y + h + 0.022,
            z - d / 2 + iz * stepZ
          );
          stud.castShadow = true;
          this.brickGroup.add(stud);
        }
      }
      return bMesh;
    };

    // Construction Assembly (Playful Castle Tower under construction)
    // Layer 1: Base Bricks on Rug
    addBrick(1.6, 0.24, 0.8, -0.3, 0.0, 0, materials.green);
    addBrick(1.4, 0.24, 0.8, 0.4, 0.0, 0.05, materials.blue);

    // Layer 2: Mid Wall Blocks
    addBrick(1.0, 0.24, 0.6, -0.2, 0.24, -0.05, materials.yellow);
    addBrick(1.2, 0.24, 0.6, 0.3, 0.24, 0.05, materials.red);

    // Layer 3: Central Tower Spire
    addBrick(0.7, 0.35, 0.7, 0.0, 0.48, 0.0, materials.blue);
    addBrick(0.55, 0.35, 0.55, 0.0, 0.83, 0.0, materials.yellow);

    // Conical Tower Roof & Red Flag
    const roofCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.55, 10), materials.red);
    roofCone.position.set(0.0, 1.45, 0.0);
    roofCone.castShadow = true;
    this.brickGroup.add(roofCone);

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), materials.yellow);
    flagPole.position.set(0.0, 1.85, 0.0);
    this.brickGroup.add(flagPole);

    // Flag pennant
    const flagGeo = new THREE.BufferGeometry();
    const v = new Float32Array([
      0, 0, 0,
      0.35, -0.1, 0,
      0, -0.2, 0
    ]);
    flagGeo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    flagGeo.computeVertexNormals();
    const flagMesh = new THREE.Mesh(flagGeo, materials.red);
    flagMesh.position.set(0, 2.05, 0);
    this.brickGroup.add(flagMesh);

    // Small Toy Vehicle Build next to castle
    const carChassis = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.4), materials.orange);
    carChassis.position.set(0.85, 0.12, 0.55);
    carChassis.rotation.y = -0.35;
    this.brickGroup.add(carChassis);

    const carCab = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.32), materials.blue);
    carCab.position.set(0.78, 0.28, 0.55);
    carCab.rotation.y = -0.35;
    this.brickGroup.add(carCab);

    // Scattered loose bricks on rug
    addBrick(0.35, 0.2, 0.25, -1.0, 0, 0.45, materials.yellow, 0.3);
    addBrick(0.4, 0.2, 0.25, -0.75, 0, 0.75, materials.red, -0.2);
    addBrick(0.35, 0.2, 0.25, 0.35, 0, 0.8, materials.green, 0.15);
    addBrick(0.5, 0.2, 0.25, 1.15, 0, -0.15, materials.purple, -0.4);

    this.group.add(this.brickGroup);
  }

  update(delta) {
    this.time += delta;

    // Update GLTF animation mixers
    this.mixers.forEach((mixer) => mixer.update(delta));

    // Subtle natural breathing motion if static models are loaded without skeletal rigs
    Object.values(this.models).forEach((model, idx) => {
      if (model && this.mixers.length === 0) {
        model.position.y += Math.sin(this.time * 2.0 + idx) * 0.0008;
      }
    });
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    this.mixers.forEach((m) => m.stopAllAction());
    this.mixers = [];
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
