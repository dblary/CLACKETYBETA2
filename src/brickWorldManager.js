import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ==========================================
// 1. CONSTANTS & GRID OCCUPANCY
// ==========================================
export const STUD_PITCH = 0.8;      // Standard LDraw horizontal stud unit
export const PLATE_HEIGHT = 0.32;   // Flat plate vertical height
export const SNAP_DISTANCE = 1.8;

export class BrickWorldManager {
  constructor(scene, cannonWorld, sounds, steamParticles) {
    this.scene = scene;
    this.cannonWorld = cannonWorld;
    this.sounds = sounds;
    this.steamParticles = steamParticles;

    // Map of "gx,gy,gz" -> ownerId to prevent solid plastic overlap
    this.occupancyGrid = new Map();

    // Array of currently anchored, solid bricks/steps
    this.anchoredBricks = [];

    // Loose bricks tumbling under Cannon-es physics: { id, mesh, body, stepIdx, isFreeBrick }
    this.dynamicPhysicsBricks = [];

    this.activeDraggedBrick = null;
    this.activeStepIdx = null;
    this.currentRotationY = 0;
  }

  // Convert continuous 3D world space to integer grid voxels
  worldToVoxel(vec3) {
    return {
      gx: Math.round(vec3.x / STUD_PITCH),
      gy: Math.max(0, Math.round(vec3.y / PLATE_HEIGHT)),
      gz: Math.round(vec3.z / STUD_PITCH)
    };
  }

  voxelToWorld(gx, gy, gz) {
    return new THREE.Vector3(
      gx * STUD_PITCH,
      gy * PLATE_HEIGHT,
      gz * STUD_PITCH
    );
  }

  // ==========================================
  // 2. THE DOWNWARD SUPPORT & COLLISION RULE
  // ==========================================
  validatePlacement(mesh, targetVoxel, rotationY = this.currentRotationY) {
    const dims = mesh.userData?.dimensions || { studsX: 2, studsZ: 4, platesY: 3 };
    const isRotated = Math.abs(Math.sin(rotationY)) > 0.7;
    const studsX = isRotated ? (dims.studsZ || 2) : (dims.studsX || 2);
    const studsZ = isRotated ? (dims.studsX || 2) : (dims.studsZ || 2);
    const platesY = dims.platesY || 1;
    let hasSolidFoundationBelow = false;

    // Ground or rail baseplate check: Level 0 or 1 provides instant support
    if (targetVoxel.gy <= 1) {
      hasSolidFoundationBelow = true;
    }

    const startX = -Math.floor(studsX / 2);
    const startZ = -Math.floor(studsZ / 2);

    // Check every voxel slice this brick occupies
    for (let dy = 0; dy < platesY; dy++) {
      for (let dx = 0; dx < studsX; dx++) {
        for (let dz = 0; dz < studsZ; dz++) {
          const curX = targetVoxel.gx + startX + dx;
          const curY = targetVoxel.gy + dy;
          const curZ = targetVoxel.gz + startZ + dz;
          const checkKey = `${curX},${curY},${curZ}`;

          // Overlap check: Cannot occupy cells that already have solid plastic
          if (this.occupancyGrid.has(checkKey)) {
            return false;
          }

          // Support check for elevated pieces: Check the layer directly underneath (Y - 1)
          if (targetVoxel.gy > 1) {
            const foundationKey = `${curX},${targetVoxel.gy - 1},${curZ}`;
            if (this.occupancyGrid.has(foundationKey)) {
              hasSolidFoundationBelow = true;
            }
          }
        }
      }
    }

    return hasSolidFoundationBelow;
  }

  // ==========================================
  // 3. DRAG & DROP POINTER HANDLERS
  // ==========================================
  startDragging(meshTemplate, stepIdx = null, options = {}) {
    if (this.activeDraggedBrick) {
      this.scene.remove(this.activeDraggedBrick);
      this.activeDraggedBrick = null;
    }

    this.activeDraggedBrick = meshTemplate;
    this.activeStepIdx = stepIdx;
    this.currentRotationY = options.initialRotationY || 0;
    this.activeDraggedBrick.rotation.set(0, this.currentRotationY, 0);

    // Compute or preserve dimensions
    if (!this.activeDraggedBrick.userData.dimensions) {
      const box = new THREE.Box3().setFromObject(this.activeDraggedBrick);
      const size = new THREE.Vector3();
      box.getSize(size);
      this.activeDraggedBrick.userData.dimensions = {
        studsX: Math.max(1, Math.round(size.x / STUD_PITCH)),
        platesY: Math.max(1, Math.round(size.y / PLATE_HEIGHT)),
        studsZ: Math.max(1, Math.round(size.z / STUD_PITCH))
      };
    }

    this.scene.add(this.activeDraggedBrick);
  }

  rotateActivePiece(delta = Math.PI / 2) {
    if (!this.activeDraggedBrick) return;
    const TWO_PI = Math.PI * 2;
    this.currentRotationY = ((this.currentRotationY + delta) % TWO_PI + TWO_PI) % TWO_PI;
    this.activeDraggedBrick.rotation.y = this.currentRotationY;
  }

  updateDragPosition(groundIntersectionPoint, targetSnapPos = null) {
    if (!this.activeDraggedBrick || !groundIntersectionPoint) return;

    // Check voxel for snapping
    const testPos = targetSnapPos || groundIntersectionPoint;
    const voxel = this.worldToVoxel(testPos);
    const snappedWorld = targetSnapPos ? targetSnapPos.clone() : this.voxelToWorld(voxel.gx, voxel.gy, voxel.gz);

    const isValid = this.validatePlacement(this.activeDraggedBrick, voxel);
    const dist = groundIntersectionPoint.distanceTo(snappedWorld);

    if (isValid && dist < SNAP_DISTANCE) {
      // MAGNETIC SNAP: Suck into valid studs
      this.activeDraggedBrick.position.lerp(snappedWorld, 0.45);
      this.setEmissiveCue(this.activeDraggedBrick, 0x00ff88, 0.7); // subtle green cue
      this.activeDraggedBrick.userData.canSnap = true;
      this.activeDraggedBrick.userData.snapVoxel = voxel;
      this.activeDraggedBrick.userData.snapWorldPos = snappedWorld;
    } else {
      // FREE HOVER: Follow pointer slightly elevated above board
      this.activeDraggedBrick.position.set(
        groundIntersectionPoint.x,
        groundIntersectionPoint.y + 0.5,
        groundIntersectionPoint.z
      );
      this.setEmissiveCue(this.activeDraggedBrick, 0x000000, 0);
      this.activeDraggedBrick.userData.canSnap = false;
    }
  }

  releaseActivePiece() {
    if (!this.activeDraggedBrick) return null;

    const brick = this.activeDraggedBrick;
    const stepIdx = this.activeStepIdx;
    this.activeDraggedBrick = null;
    this.activeStepIdx = null;

    this.setEmissiveCue(brick, 0x000000, 0);

    // CASE 1: Valid Stud Snap with Support Below -> [Locked to Structure]
    if (brick.userData.canSnap && brick.userData.snapVoxel) {
      const v = brick.userData.snapVoxel;
      const snapPos = brick.userData.snapWorldPos || this.voxelToWorld(v.gx, v.gy, v.gz);
      brick.position.copy(snapPos);
      brick.rotation.y = this.currentRotationY;

      // Lock voxels into occupancy map
      const dims = brick.userData.dimensions || { studsX: 2, studsZ: 4, platesY: 3 };
      const isRotated = Math.abs(Math.sin(this.currentRotationY)) > 0.7;
      const studsX = isRotated ? (dims.studsZ || 2) : (dims.studsX || 2);
      const studsZ = isRotated ? (dims.studsX || 2) : (dims.studsZ || 2);
      const platesY = dims.platesY || 1;
      const startX = -Math.floor(studsX / 2);
      const startZ = -Math.floor(studsZ / 2);

      for (let dy = 0; dy < platesY; dy++) {
        for (let dx = 0; dx < studsX; dx++) {
          for (let dz = 0; dz < studsZ; dz++) {
            const curX = v.gx + startX + dx;
            const curY = v.gy + dy;
            const curZ = v.gz + startZ + dz;
            this.occupancyGrid.set(`${curX},${curY},${curZ}`, brick.id || `step_${stepIdx}`);
          }
        }
      }

      this.anchoredBricks.push(brick);
      this.sounds?.playPlasticThwackSnap?.();
      for (let i = 0; i < 4; i++) {
        this.steamParticles?.emitPuff?.(0, 0.4, 0.3);
      }

      return { status: 'locked', brick, stepIdx };
    }

    // CASE 2: No Support / Dropped in Air -> [Cannon-es Dynamic Fall]
    const looseItem = this.dropWithPhysics(brick, stepIdx);
    return { status: 'physics_fall', item: looseItem, stepIdx };
  }

  // ==========================================
  // 4. CANNON-ES RIGID BODY DROP
  // ==========================================
  dropWithPhysics(mesh, stepIdx = null, extraData = {}) {
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const halfExtents = new CANNON.Vec3(
      Math.max(0.15, size.x / 2),
      Math.max(0.15, size.y / 2),
      Math.max(0.15, size.z / 2)
    );
    const boxShape = new CANNON.Box(halfExtents);

    const body = new CANNON.Body({
      mass: 0.65,
      shape: boxShape,
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
      quaternion: new CANNON.Quaternion(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w)
    });

    // Gentle random spin for a realistic tumble
    body.angularVelocity.set((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3);
    body.velocity.set((Math.random() - 0.5) * 0.8, -1.2, (Math.random() - 0.5) * 0.8);

    body.addEventListener('collide', (e) => {
      const contact = e.contact;
      const impactVel = contact ? contact.getImpactVelocityAlongNormal() : 1.5;
      if (impactVel > 0.8 && !body.hasRecentlyCollided) {
        body.hasRecentlyCollided = true;
        this.sounds?.playLegoFalled?.(Math.min(1.2, impactVel / 2.5));
        navigator.vibrate?.(18);
        setTimeout(() => { body.hasRecentlyCollided = false; }, 90);
      }
    });

    this.cannonWorld.addBody(body);

    const item = {
      id: `loose_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      mesh,
      body,
      stepIdx,
      isFreeBrick: !!extraData.isFreeBrick
    };

    mesh.userData.isLoosePhysicsBrick = true;
    mesh.userData.looseItem = item;
    mesh.traverse((c) => {
      c.userData.isLoosePhysicsBrick = true;
      c.userData.looseItem = item;
    });

    this.dynamicPhysicsBricks.push(item);
    return item;
  }

  // Smoothly springs loose brick back to [In Tray]
  springBackToTray(item, onComplete = null) {
    const idx = this.dynamicPhysicsBricks.indexOf(item);
    if (idx !== -1) {
      this.dynamicPhysicsBricks.splice(idx, 1);
    }

    try {
      this.cannonWorld.removeBody(item.body);
    } catch (_) {}

    const mesh = item.mesh;
    const startPos = mesh.position.clone();
    const startScale = mesh.scale.clone();
    const targetPos = new THREE.Vector3(startPos.x * 0.35, -1.5, startPos.z + 5.0);

    const startTime = performance.now();
    const duration = 260; // ms

    this.sounds?.playPop?.();

    const anim = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1.0, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 2.5);

      mesh.position.lerpVectors(startPos, targetPos, ease);
      const s = Math.max(0.05, 1.0 - t * 0.9);
      mesh.scale.set(startScale.x * s, startScale.y * s, startScale.z * s);

      mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            m.transparent = true;
            m.opacity = Math.max(0, 1.0 - t * 1.2);
          });
        }
      });

      if (t >= 1.0) {
        clearInterval(anim);
        this.scene.remove(mesh);
        if (onComplete) onComplete(item);
      }
    }, 16);
  }

  setEmissiveCue(mesh, hex, intensity = 0.5) {
    mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m.emissive) {
            m.emissive.setHex(hex);
            m.emissiveIntensity = intensity;
          }
        });
      }
    });
  }

  // Call this in the window.requestAnimationFrame loop
  stepPhysics(dt = 1 / 60) {
    this.cannonWorld.step(dt);
    for (const item of this.dynamicPhysicsBricks) {
      item.mesh.position.copy(item.body.position);
      item.mesh.quaternion.copy(item.body.quaternion);

      // Floor boundary safety clamp
      if (item.body.position.y < -3.5) {
        item.body.position.y = -0.4;
        item.body.velocity.set(0, 0, 0);
        item.body.angularVelocity.set(0, 0, 0);
      }
    }
  }

  clear() {
    this.occupancyGrid.clear();
    this.anchoredBricks = [];
    for (const item of this.dynamicPhysicsBricks) {
      try {
        this.cannonWorld.removeBody(item.body);
      } catch (_) {}
      this.scene.remove(item.mesh);
    }
    this.dynamicPhysicsBricks = [];
  }
}
