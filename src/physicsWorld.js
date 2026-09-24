import * as CANNON_MODULE from 'cannon-es';
import * as THREE from 'three';

// Fallback to window.CANNON if loaded via CDN script tag, else use ES module
export const CANNON = (typeof window !== 'undefined' && window.CANNON) ? window.CANNON : CANNON_MODULE;

/**
 * Calculates collision shape and center position for LEGO pieces and meshes
 * to eliminate interpenetration with ground and stacked bricks.
 */
function getBrickShapeAndCenter(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  let halfX = Math.max(0.2, size.x / 2);
  let halfZ = Math.max(0.2, size.z / 2);
  let halfY;
  let centerY;

  // Check if first child is the main body BoxGeometry (excluding top studs)
  const bodyChild = mesh.children?.find(
    (c) => c.isMesh && c.geometry?.parameters && c.geometry.parameters.height
  );

  if (bodyChild && bodyChild.geometry.parameters) {
    const p = bodyChild.geometry.parameters;
    halfX = (p.width || size.x) / 2;
    halfY = (p.height || size.y) / 2;
    halfZ = (p.depth || size.z) / 2;
    centerY = box.min.y + halfY;
  } else {
    // If it has multiple children (e.g. body + studs), exclude stud height (0.18)
    const hasStuds = mesh.children && mesh.children.length > 1;
    if (hasStuds && size.y > 0.4) {
      const bodyH = Math.max(0.3, size.y - 0.18);
      halfY = bodyH / 2;
      centerY = box.min.y + halfY;
    } else {
      halfY = Math.max(0.15, size.y / 2);
      centerY = center.y;
    }
  }

  const centerPos = new THREE.Vector3(center.x, centerY, center.z);
  const shape = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));

  return { shape, centerPos, halfX, halfY, halfZ };
}

/**
 * Realistic Rigid-Body Physics World for LEGO Train Builder
 * Powered by Cannon-es
 */
export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World();
    // Earth gravity tuned for snappy toy weight
    this.world.gravity.set(0, -22, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // High stability GSSolver configuration
    if (this.world.solver) {
      this.world.solver.iterations = 22;
      this.world.solver.tolerance = 0.0001;
    }

    // Contact Materials
    this.plasticMaterial = new CANNON.Material('plastic');
    this.groundMaterial = new CANNON.Material('ground');

    this.contactMaterial = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.plasticMaterial,
      {
        friction: 0.65,
        restitution: 0.12, // Gentle plastic response without erratic jitter
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
      }
    );

    this.plasticContactMaterial = new CANNON.ContactMaterial(
      this.plasticMaterial,
      this.plasticMaterial,
      {
        friction: 0.60,
        restitution: 0.10,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
      }
    );

    this.world.addContactMaterial(this.contactMaterial);
    this.world.addContactMaterial(this.plasticContactMaterial);
    this.world.defaultContactMaterial = this.plasticContactMaterial;

    // Active physics objects
    this.looseBricks = []; // { id, body, meshGroup, stepIdx, scene }
    this.crashedMeshes = []; // { body, mesh, originalMesh, startPos, startQuat, targetPos, targetQuat, stepIdx }
    this.isCrashed = false;
    this.isRebuilding = false;
    this.rebuildStartTime = 0;
    this.rebuildDuration = 700; // ms
    this.onRebuildComplete = null;

    this.initGroundColliders();
  }

  /**
   * Static baseplate and floor colliders with perimeter boundaries
   */
  initGroundColliders(baseplateSize = 22) {
    // 1. Static baseplate collider matching green baseplate (top at Y = 0.08, height = 0.16)
    const halfBase = baseplateSize / 2;
    const baseplateShape = new CANNON.Box(new CANNON.Vec3(halfBase, 0.08, halfBase));
    const baseplateBody = new CANNON.Body({
      mass: 0,
      material: this.groundMaterial,
      shape: baseplateShape
    });
    baseplateBody.position.set(0, 0, 0);
    this.world.addBody(baseplateBody);

    // 2. Wide table floor plane below baseplate to catch tumbling pieces
    const floorShape = new CANNON.Box(new CANNON.Vec3(50, 0.5, 50));
    const floorBody = new CANNON.Body({
      mass: 0,
      material: this.groundMaterial,
      shape: floorShape
    });
    floorBody.position.set(0, -0.5, 0);
    this.world.addBody(floorBody);

    // 3. Invisible containment fences to prevent bricks from flying off infinitely
    const fenceThick = 1.0;
    const fenceHeight = 12.0;
    const fenceDist = 40.0;

    const shapeX = new CANNON.Box(new CANNON.Vec3(fenceThick, fenceHeight, 45));
    const f1 = new CANNON.Body({ mass: 0, shape: shapeX });
    f1.position.set(fenceDist, fenceHeight / 2, 0);
    this.world.addBody(f1);

    const f2 = new CANNON.Body({ mass: 0, shape: shapeX });
    f2.position.set(-fenceDist, fenceHeight / 2, 0);
    this.world.addBody(f2);

    const shapeZ = new CANNON.Box(new CANNON.Vec3(45, fenceHeight, fenceThick));
    const f3 = new CANNON.Body({ mass: 0, shape: shapeZ });
    f3.position.set(0, fenceHeight / 2, fenceDist);
    this.world.addBody(f3);

    const f4 = new CANNON.Body({ mass: 0, shape: shapeZ });
    f4.position.set(0, fenceHeight / 2, -fenceDist);
    this.world.addBody(f4);
  }

  /**
   * Spawns a loose falling brick with realistic rigid body dynamics
   */
  spawnLooseFallingBrick(meshGroup, stepIdx, scene, sounds, extraData = {}) {
    if (!meshGroup) return null;

    meshGroup.updateMatrixWorld(true);
    const { shape, centerPos, halfX, halfY, halfZ } = getBrickShapeAndCenter(meshGroup);

    const body = new CANNON.Body({
      mass: 0.8 + (halfX * halfY * halfZ) * 0.5,
      shape,
      material: this.plasticMaterial,
      linearDamping: 0.15,
      angularDamping: 0.28
    });

    body.position.set(centerPos.x, centerPos.y, centerPos.z);
    body.quaternion.set(
      meshGroup.quaternion.x,
      meshGroup.quaternion.y,
      meshGroup.quaternion.z,
      meshGroup.quaternion.w
    );

    // Subtle random tumble angular velocity
    body.angularVelocity.set(
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5,
      (Math.random() - 0.5) * 4.5
    );

    // Initial slight outward and downward velocity
    body.velocity.set(
      (Math.random() - 0.5) * 1.0,
      -1.2,
      (Math.random() - 0.5) * 1.0
    );

    body.addEventListener('collide', (e) => {
      const contact = e.contact;
      const impactVel = contact ? contact.getImpactVelocityAlongNormal() : 1.5;
      if (impactVel > 0.8 && !body.hasRecentlyCollided) {
        body.hasRecentlyCollided = true;
        if (sounds?.playLegoFalled) {
          sounds.playLegoFalled(Math.min(1.2, impactVel / 2.5));
        } else {
          sounds?.playPlasticRattle?.(Math.min(1.2, impactVel / 2.5));
        }
        navigator.vibrate?.(20);
        setTimeout(() => {
          body.hasRecentlyCollided = false;
        }, 90);
      }
    });

    this.world.addBody(body);

    const resolvedStepIdx = typeof stepIdx === 'number' ? stepIdx : null;
    const resolvedScene = (scene && typeof scene.remove === 'function') ? scene : meshGroup.parent;

    const item = {
      id: `loose_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      body,
      meshGroup,
      stepIdx: resolvedStepIdx,
      scene: resolvedScene,
      isFreeBrick: !!extraData.isFreeBrick
    };

    this.looseBricks.push(item);
    return item;
  }

  /**
   * Returns all scattered loose bricks back into the tray with a smooth shrink/fade
   */
  cleanUpLooseBricks(sounds, onCleaned) {
    if (this.looseBricks.length === 0) return;

    sounds?.playPop?.();
    const cleanedStepIndices = [];

    const toClean = [...this.looseBricks];
    this.looseBricks = [];

    toClean.forEach(({ body, meshGroup, stepIdx, scene }) => {
      this.world.removeBody(body);
      if (typeof stepIdx === 'number') {
        cleanedStepIndices.push(stepIdx);
      }

      const targetScene = (scene && typeof scene.remove === 'function') ? scene : meshGroup.parent;
      if (!targetScene) return;

      const startPos = meshGroup.position.clone();
      const targetPos = new THREE.Vector3(startPos.x, startPos.y - 1.5, startPos.z);
      const startScale = meshGroup.scale.clone();
      const startTime = performance.now();
      const duration = 220;

      const animInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1.0, elapsed / duration);
        meshGroup.position.lerpVectors(startPos, targetPos, t);
        meshGroup.scale.lerpVectors(startScale, new THREE.Vector3(0.01, 0.01, 0.01), t);

        if (t >= 1.0) {
          clearInterval(animInterval);
          try {
            targetScene.remove(meshGroup);
          } catch (_) {}
        }
      }, 16);
    });

    if (onCleaned) onCleaned(cleanedStepIndices);
  }

  /**
   * DEMOLISH / CRASH MODE
   * Uncouples placed bricks into dynamic rigid bodies with radial explosion impulse
   */
  crashDisassemble({ trainData = null, builtSteps = null, placedBricks = [], scene, sounds, steamParticles }) {
    const hasTrainSteps = trainData && builtSteps && builtSteps.size > 0;
    const hasPlacedBricks = placedBricks && placedBricks.length > 0;

    if ((!hasTrainSteps && !hasPlacedBricks) || this.isCrashed) return false;

    this.isCrashed = true;
    this.crashedMeshes = [];

    sounds?.playCrash?.();
    navigator.vibrate?.([80, 50, 100, 50, 120]);

    const explosionCenter = new THREE.Vector3(0, 1.4, 0);
    const meshesToCrash = [];

    // 1. Collect train meshes
    if (hasTrainSteps) {
      builtSteps.forEach((stepIdx) => {
        const stepData = trainData.steps[stepIdx];
        if (!stepData) return;
        stepData.meshes.forEach((mesh) => {
          if (mesh.visible) {
            meshesToCrash.push({ mesh, stepIdx, isFreeBrick: false });
          }
        });
      });
    }

    // 2. Collect free builder meshes
    if (hasPlacedBricks) {
      placedBricks.forEach((mesh) => {
        if (mesh.visible) {
          meshesToCrash.push({ mesh, stepIdx: null, isFreeBrick: true });
        }
      });
    }

    if (meshesToCrash.length === 0) {
      this.isCrashed = false;
      return false;
    }

    meshesToCrash.forEach(({ mesh, stepIdx, isFreeBrick }) => {
      mesh.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      mesh.getWorldQuaternion(worldQuat);
      mesh.getWorldScale(worldScale);

      const cloneMesh = mesh.clone();
      cloneMesh.position.copy(worldPos);
      cloneMesh.quaternion.copy(worldQuat);
      cloneMesh.scale.copy(worldScale);
      cloneMesh.castShadow = true;
      scene.add(cloneMesh);

      mesh.visible = false;

      const { shape, centerPos, halfX, halfY, halfZ } = getBrickShapeAndCenter(cloneMesh);

      const body = new CANNON.Body({
        mass: 0.5 + (halfX * halfY * halfZ) * 0.7,
        shape,
        material: this.plasticMaterial,
        linearDamping: 0.12,
        angularDamping: 0.22
      });

      body.position.set(centerPos.x, centerPos.y, centerPos.z);
      body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

      // Radial impulse with upward pop
      const dir = centerPos.clone().sub(explosionCenter);
      dir.y = Math.abs(dir.y) + 0.65;
      dir.normalize();

      const force = (3.2 + Math.random() * 3.8) * body.mass;
      body.applyImpulse(
        new CANNON.Vec3(dir.x * force, dir.y * force, dir.z * force),
        body.position
      );

      body.angularVelocity.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );

      body.addEventListener('collide', (e) => {
        const impact = e.contact ? e.contact.getImpactVelocityAlongNormal() : 2.0;
        if (impact > 1.2 && !body.hasCollidedRecently) {
          body.hasCollidedRecently = true;
          if (sounds?.playLegoFalled) {
            sounds.playLegoFalled(Math.min(1.2, impact / 3.0));
          } else {
            sounds?.playPlasticRattle?.(Math.min(1.2, impact / 3.0));
          }
          setTimeout(() => { body.hasCollidedRecently = false; }, 80);
        }
      });

      this.world.addBody(body);

      this.crashedMeshes.push({
        body,
        mesh: cloneMesh,
        originalMesh: mesh,
        targetWorldPos: worldPos.clone(),
        targetWorldQuat: worldQuat.clone(),
        stepIdx,
        isFreeBrick
      });
    });

    // Puffs of crash dust
    for (let i = 0; i < 8; i++) {
      steamParticles?.emitPuff?.(
        (Math.random() - 0.5) * 3,
        1.0 + Math.random() * 1.5,
        (Math.random() - 0.5) * 3
      );
    }

    return true;
  }

  // Backward compatibility wrapper
  crashDisassembleTrain(trainData, builtSteps, scene, sounds, steamParticles) {
    return this.crashDisassemble({
      trainData,
      builtSteps,
      placedBricks: [],
      scene,
      sounds,
      steamParticles
    });
  }

  /**
   * Free Builder Physics Simulation / Stability Test
   * Dynamic rigid body simulation with zero initial penetration.
   * Cantilever and unsupported structures topple naturally; supported structures rest stably.
   */
  simulateFreeBricks({ placedBricks, scene, sounds, steamParticles }) {
    if (!placedBricks || placedBricks.length === 0 || this.isCrashed) return false;

    this.isCrashed = true;
    this.crashedMeshes = [];

    if (sounds?.playLegoFalled) {
      sounds.playLegoFalled(0.85);
    } else {
      sounds?.playPlasticRattle?.(0.85);
    }
    navigator.vibrate?.([40, 30, 40]);

    placedBricks.forEach((mesh) => {
      if (!mesh.visible) return;

      mesh.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      mesh.getWorldQuaternion(worldQuat);
      mesh.getWorldScale(worldScale);

      const cloneMesh = mesh.clone();
      cloneMesh.position.copy(worldPos);
      cloneMesh.quaternion.copy(worldQuat);
      cloneMesh.scale.copy(worldScale);
      cloneMesh.castShadow = true;
      scene.add(cloneMesh);

      mesh.visible = false;

      const { shape, centerPos, halfX, halfY, halfZ } = getBrickShapeAndCenter(cloneMesh);

      const body = new CANNON.Body({
        mass: 0.8 + (halfX * halfY * halfZ) * 0.7,
        shape,
        material: this.plasticMaterial,
        linearDamping: 0.12,
        angularDamping: 0.22
      });

      body.position.set(centerPos.x, centerPos.y, centerPos.z);
      body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

      // Micro nudge to wake solver contacts without exploding
      body.angularVelocity.set(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      );

      body.addEventListener('collide', (e) => {
        const impact = e.contact ? e.contact.getImpactVelocityAlongNormal() : 1.5;
        if (impact > 0.8 && !body.hasCollidedRecently) {
          body.hasCollidedRecently = true;
          if (sounds?.playLegoFalled) {
            sounds.playLegoFalled(Math.min(1.2, impact / 2.5));
          } else {
            sounds?.playPlasticRattle?.(Math.min(1.2, impact / 2.5));
          }
          setTimeout(() => { body.hasCollidedRecently = false; }, 80);
        }
      });

      this.world.addBody(body);

      this.crashedMeshes.push({
        body,
        mesh: cloneMesh,
        originalMesh: mesh,
        targetWorldPos: worldPos.clone(),
        targetWorldQuat: worldQuat.clone(),
        isFreeBrick: true,
        isSimulated: true
      });
    });

    return true;
  }

  /**
   * Rebuild button to rewind the physics and snap bricks back together
   */
  rebuildCrashedTrain(scene, sounds, steamParticles, onComplete) {
    if (!this.isCrashed || this.isRebuilding) return;

    this.isRebuilding = true;
    this.rebuildStartTime = performance.now();
    this.onRebuildComplete = onComplete;

    sounds?.playClack?.();

    // Freeze physics bodies and prepare rewind vectors
    this.crashedMeshes.forEach((item) => {
      this.world.removeBody(item.body);
      item.startPos = item.mesh.position.clone();
      item.startQuat = item.mesh.quaternion.clone();
    });
  }

  /**
   * Step physics simulation and synchronize transforms with Three.js meshes
   */
  update(delta, scene, sounds, steamParticles) {
    // 1. Rebuild Rewind Animation
    if (this.isRebuilding) {
      const elapsed = performance.now() - this.rebuildStartTime;
      const progress = Math.min(1.0, elapsed / this.rebuildDuration);
      // Smooth ease-out cubic
      const t = 1 - Math.pow(1 - progress, 3);

      this.crashedMeshes.forEach((item) => {
        item.mesh.position.lerpVectors(item.startPos, item.targetWorldPos, t);
        item.mesh.quaternion.slerpQuaternions(item.startQuat, item.targetWorldQuat, t);
      });

      if (progress >= 1.0) {
        this.isRebuilding = false;
        this.isCrashed = false;

        this.crashedMeshes.forEach((item) => {
          if (scene && typeof scene.remove === 'function') {
            scene.remove(item.mesh);
          } else if (item.mesh.parent) {
            item.mesh.parent.remove(item.mesh);
          }
          if (item.originalMesh) {
            item.originalMesh.visible = true;
          }
        });
        this.crashedMeshes = [];

        sounds?.playLegoPressed?.(1.0, 1.1);
        navigator.vibrate?.([40]);

        for (let i = 0; i < 6; i++) {
          steamParticles?.emitPuff?.(0, 0.5, 0.4);
        }

        if (this.onRebuildComplete) {
          this.onRebuildComplete();
          this.onRebuildComplete = null;
        }
      }
      return;
    }

    // 2. Normal Physics Step
    this.world.step(1 / 60, Math.min(delta, 0.05), 5);

    // Sync loose falling bricks
    for (let i = this.looseBricks.length - 1; i >= 0; i--) {
      const item = this.looseBricks[i];
      item.meshGroup.position.set(item.body.position.x, item.body.position.y, item.body.position.z);
      item.meshGroup.quaternion.set(
        item.body.quaternion.x,
        item.body.quaternion.y,
        item.body.quaternion.z,
        item.body.quaternion.w
      );

      // Floor boundary safety clamp
      if (item.body.position.y < -3.5) {
        item.body.position.y = -0.4;
        item.body.velocity.set(0, 0, 0);
        item.body.angularVelocity.set(0, 0, 0);
      }
    }

    // Sync crashed train meshes
    if (this.isCrashed && !this.isRebuilding) {
      this.crashedMeshes.forEach((item) => {
        item.mesh.position.set(item.body.position.x, item.body.position.y, item.body.position.z);
        item.mesh.quaternion.set(
          item.body.quaternion.x,
          item.body.quaternion.y,
          item.body.quaternion.z,
          item.body.quaternion.w
        );

        if (item.body.position.y < -3.5) {
          item.body.position.y = -0.4;
          item.body.velocity.set(0, 0, 0);
          item.body.angularVelocity.set(0, 0, 0);
        }
      });
    }
  }
}

export const physicsWorld = new PhysicsWorld();
