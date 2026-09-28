import * as THREE from 'three';
import { PlayroomEnvironment } from './environment/PlayroomEnvironment.js';
import { TitleScreen, setupTitleScreen } from './titleScreen.js';

export { TitleScreen, setupTitleScreen };

/**
 * SceneManager for Balanced Tactile LEGO Assembly & Puzzle-Solving (Ages 6-12)
 * Features:
 * - NO permanent spoon-fed arrows or in-world glowing beacons
 * - Gentle "💡 Hint" button trigger: pulses target studs with a warm gold ring for 2 seconds
 * - Brief tactile scale bounce on snap (1.0 -> 1.06 -> 1.0)
 * - Quick celebratory puff of star particles
 */

export class SceneManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.titleScreen = null;

    // Hint Pulse Container (Activated ONLY on clicking the blueprint Hint button)
    this.hintRingGroup = new THREE.Group();
    this.hintRingGroup.name = 'gold-hint-ring-group';
    this.hintRingGroup.visible = false;
    this.scene.add(this.hintRingGroup);

    // Sparkle particles pool
    this.sparkleParticles = [];
    this.sparkleGroup = new THREE.Group();
    this.sparkleGroup.name = 'sparkle-burst-group';
    this.scene.add(this.sparkleGroup);

    // Active squash-and-stretch animations: { mesh, baseScale, startTime, duration }
    this.squashList = [];

    // Hint timer state
    this.hintEndTime = 0;
    this.hintTargetPos = null;

    // Floating drag state & raycast tracking
    this.draggedBrick = null;
    this.baseplateMesh = null;
    this.shadowPlane = null;
    this.raycastSurfaces = [];
    this.staticPlacedBricks = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initGoldHintRing();
  }

  setupTitleScreen(options = {}) {
    if (this.titleScreen) {
      this.titleScreen.dispose();
      this.titleScreen = null;
    }
    this.titleScreen = setupTitleScreen(options);
    return this.titleScreen;
  }

  /**
   * Applies backface culling to room walls to prevent blank screens when the camera views the room from outside.
   * If wall polygon normals point inward toward the room interior, THREE.FrontSide renders the interior
   * and culls the back faces from outside. If wall normals face outward, pass THREE.BackSide instead.
   * @param {THREE.Object3D} roomModel - Root or group of the room model/diorama
   * @param {number} [side=THREE.FrontSide] - THREE.FrontSide or THREE.BackSide
   */
  applyWallCulling(roomModel, side = THREE.FrontSide) {
    if (!roomModel) return;
    roomModel.traverse((child) => {
      if (child.isMesh && (child.name.toLowerCase().includes('wall') || child.material?.name?.toLowerCase().includes('wall'))) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.side = side;
            mat.needsUpdate = true;
          });
        } else if (child.material) {
          child.material.side = side;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  setupPlayroomEnvironment(scene = this.scene, camera = this.camera, controls = null, trackGroup = null, renderer = null) {
    // 1. ENVIRONMENT CLEANUP:
    if (this.playroomEnv) {
      this.playroomEnv.dispose();
      this.playroomEnv = null;
    }
    if (this.woodFloor) {
      scene.remove(this.woodFloor);
      this.woodFloor = null;
    }
    if (this.backdropWall) {
      scene.remove(this.backdropWall);
      this.backdropWall = null;
    }
    if (this.shadowFloor) {
      scene.remove(this.shadowFloor);
      this.shadowFloor = null;
    }
    if (this.baseplateMesh) {
      scene.remove(this.baseplateMesh);
      this.baseplateMesh = null;
    }
    if (this.playroomDiorama) {
      scene.remove(this.playroomDiorama);
      this.playroomDiorama = null;
    }

    // 2. ATMOSPHERIC WARM PLAYROOM ROOM AMBIENCE & BLEND FOG:
    const bgPlayroom = 0xf5ede2;
    scene.background = new THREE.Color(bgPlayroom);
    scene.fog = new THREE.Fog(bgPlayroom, 35, 95);

    // 3. BUILD NATIVE THREE.JS / WEBGL PLAYROOM ENVIRONMENT:
    this.playroomEnv = new PlayroomEnvironment(scene, renderer, 'high');
    const contactMesh = this.playroomEnv.getBuildContactMesh();
    if (contactMesh) {
      this.baseplateMesh = contactMesh;
      this.raycastSurfaces.length = 0;
      this.raycastSurfaces.push(contactMesh);
    }

    // 1. FIX CAMERA WALL CLIPPING (NO MORE BLANK BROWN SCREENS):
    const roomModel = this.playroomEnv.roomGroup || this.playroomEnv.environmentGroup;
    this.applyWallCulling(roomModel, THREE.FrontSide);

    // 4. TRACK ELEVATION & FLUSH GROUNDING:
    if (trackGroup) {
      this.setupTrack(trackGroup);
    }

    // 5. CAMERA FRAMING:
    if (camera) {
      camera.fov = 38;
      camera.position.set(0, 5.0, 8.5);
      camera.lookAt(0, 0.4, 0);
      camera.updateProjectionMatrix();
    }

    if (controls) {
      controls.target.set(0, 0.4, 0);
      controls.minPolarAngle = Math.PI / 6;   // ~30°
      controls.maxPolarAngle = Math.PI / 2.3; // ~78°
      controls.minAzimuthAngle = -Math.PI / 1.8; // Limits orbit to front ~160°
      controls.maxAzimuthAngle = Math.PI / 1.8;
      controls.minDistance = 4.0;
      controls.maxDistance = 25.0; // Full zoom out across room diorama
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.update();
    }

    return this.playroomEnv;
  }

  setupTrack(trackGroup) {
    if (!trackGroup) return;
    trackGroup.position.set(0, 0, 0);
    trackGroup.rotation.set(0, 0, 0);
    trackGroup.scale.set(1, 1, 1);
    trackGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  setBaseplate(mesh) {
    this.baseplateMesh = mesh;
  }

  setPlacedBricks(bricks) {
    this.staticPlacedBricks = Array.isArray(bricks) ? bricks : [];
  }

  startDraggingPiece(piece) {
    if (!piece) return;
    this.draggedBrick = piece;
    piece.visible = false; // Hide until pointer hits a valid raycast point
  }

  startFloatingDrag(brick) {
    this.startDraggingPiece(brick);
  }

  /**
   * TRACK CURSOR TO BASEPLATE RAYCAST:
   * Raycasts pointer against baseplate and placed bricks,
   * quantizing draggedBrick position to 0.8 stud pitch grid.
   */
  onPointerMove(e, draggedBrick = this.draggedBrick) {
    const brick = draggedBrick || this.draggedBrick;
    if (!brick) return null;

    const clientX = (e && typeof e.clientX === 'number') ? e.clientX : (typeof e === 'number' ? e : 0);
    const clientY = (e && typeof e.clientY === 'number') ? e.clientY : (arguments[1] && typeof arguments[1] === 'number' ? arguments[1] : 0);

    const width = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1;
    const height = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 1;

    this.mouse.x = (clientX / width) * 2 - 1;
    this.mouse.y = -(clientY / height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets = [];
    if (this.baseplateMesh) targets.push(this.baseplateMesh);
    if (this.staticPlacedBricks && this.staticPlacedBricks.length > 0) {
      targets.push(...this.staticPlacedBricks);
    }

    const hits = this.raycaster.intersectObjects(targets, true).filter((h) => {
      let curr = h.object;
      while (curr && curr !== this.scene) {
        if (curr === brick) return false;
        if (curr.userData?.isEnvironment) return false;
        curr = curr.parent;
      }
      return true;
    });

    if (hits.length > 0) {
      const p = hits[0].point;
      p.x = THREE.MathUtils.clamp(p.x, -4.5, 4.5);
      p.z = THREE.MathUtils.clamp(p.z, -3.5, 3.5);
      // Quantize to stud grid
      brick.position.x = Math.round(p.x / 0.8) * 0.8;
      brick.position.z = Math.round(p.z / 0.8) * 0.8;
      brick.position.y = hits[0].point.y + (brick.userData?.height || 0.32) / 2;
      brick.visible = true; // Show once valid raycast point is established
      return { hit: hits[0], point: p, position: brick.position };
    }
    return null;
  }

  /**
   * LOCK ONLY ON RELEASE (POINTERUP):
   * Locks the brick at its current hovered position, triggers tactile bounce and sparkles.
   */
  lockFloatingDrag(draggedBrick = this.draggedBrick) {
    const brick = draggedBrick || this.draggedBrick;
    if (!brick) return null;
    this.draggedBrick = null;
    this.triggerSquashAndStretch(brick);
    this.popSparkleBurst(brick.position);
    return brick;
  }

  /**
   * CANCEL AND REMOVE FLOATING PREVIEW:
   * Called when released over tray or outside the board.
   */
  cancelFloatingDrag(draggedBrick = this.draggedBrick) {
    const brick = draggedBrick || this.draggedBrick;
    if (brick) {
      if (brick.parent) {
        brick.parent.remove(brick);
      } else if (this.scene) {
        this.scene.remove(brick);
      }
    }
    if (this.draggedBrick === brick) {
      this.draggedBrick = null;
    }
  }

  /**
   * Warm gold pulsing ring used exclusively for the 2-second Blueprint Hint
   */
  initGoldHintRing() {
    const ringGeom = new THREE.RingGeometry(0.35, 0.65, 32);
    ringGeom.rotateX(-Math.PI / 2);
    this.goldRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700, // Warm gold
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.goldRing = new THREE.Mesh(ringGeom, this.goldRingMat);
    this.hintRingGroup.add(this.goldRing);

    // Subtle inner glowing gold dot
    const dotGeom = new THREE.CircleGeometry(0.18, 24);
    dotGeom.rotateX(-Math.PI / 2);
    this.goldDotMat = new THREE.MeshBasicMaterial({
      color: 0xfff082,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.goldDot = new THREE.Mesh(dotGeom, this.goldDotMat);
    this.goldDot.position.y = 0.01;
    this.hintRingGroup.add(this.goldDot);
  }

  /**
   * 💡 Gentle Blueprint Hint:
   * Only when clicked, briefly pulses the target studs with a warm gold ring for 2 seconds.
   */
  pulseGoldHintRing(targetPos, duration = 2000) {
    if (!targetPos) return;

    this.hintTargetPos = targetPos.clone();
    this.hintRingGroup.position.copy(targetPos);
    this.hintRingGroup.visible = true;
    this.hintEndTime = performance.now() + duration;
    this.goldRingMat.opacity = 0.9;
    this.goldDotMat.opacity = 0.8;
  }

  hideGoldHintRing() {
    this.hintRingGroup.visible = false;
    this.hintEndTime = 0;
    this.hintTargetPos = null;
  }

  /**
   * Quick puff of star particles on successful snap
   */
  popSparkleBurst(worldPos, count = 12) {
    const origin = worldPos ? worldPos.clone() : new THREE.Vector3(0, 1, 0);

    const starGeom = new THREE.BufferGeometry();
    const size = 0.12;
    // 4-pointed diamond star
    const vertices = new Float32Array([
      0, size * 1.35, 0,
      -size * 0.65, 0, 0,
      size * 0.65, 0, 0,

      0, -size * 1.35, 0,
      size * 0.65, 0, 0,
      -size * 0.65, 0, 0
    ]);
    starGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const starColors = [0xffd700, 0xfff59d, 0x00ff88, 0xffffff, 0xffca28];

    for (let i = 0; i < count; i++) {
      const colorHex = starColors[i % starColors.length];
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(starGeom, mat);
      mesh.position.copy(origin);
      mesh.rotation.z = Math.random() * Math.PI * 2;

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.4 + Math.random() * 1.8;
      const vy = 1.2 + Math.random() * 1.5;

      const particle = {
        mesh,
        material: mat,
        life: 1.0,
        decay: 2.8 + Math.random() * 0.8, // ~0.3s life for quick puff
        vx: Math.cos(angle) * speed,
        vy: vy,
        vz: Math.sin(angle) * speed,
        rotSpeed: (Math.random() - 0.5) * 12,
        scale: 0.75 + Math.random() * 0.5
      };

      this.sparkleGroup.add(mesh);
      this.sparkleParticles.push(particle);
    }
  }

  /**
   * Brief scale bounce on snap: scale 1.0 -> 1.06 -> 1.0
   */
  triggerSquashAndStretch(meshOrGroup) {
    if (!meshOrGroup) return;

    const meshes = [];
    if (meshOrGroup.isMesh) {
      meshes.push(meshOrGroup);
    } else {
      meshOrGroup.traverse((c) => {
        if (c.isMesh) meshes.push(c);
      });
    }

    const now = performance.now();
    meshes.forEach((mesh) => {
      const baseScale = mesh.userData.snapBaseScale 
        ? mesh.userData.snapBaseScale.clone() 
        : mesh.scale.clone();
      mesh.userData.snapBaseScale = baseScale.clone();

      this.squashList.push({
        mesh,
        baseScale,
        startTime: now,
        duration: 90 // Brief snap bounce
      });
    });
  }

  /**
   * Transitions all completed pieces into high-gloss ABS colors with crisp subtle edge outlines
   */
  finishTrainHighGloss(trainGroup) {
    if (!trainGroup) return;
    trainGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          m.transparent = false;
          m.opacity = 1.0;
          if (m.roughness !== undefined) m.roughness = 0.22;
          if (m.clearcoat !== undefined) {
            m.clearcoat = 0.52;
            m.clearcoatRoughness = 0.15;
          }
          if (m.emissive) {
            m.emissive.setHex(0x000000);
            m.emissiveIntensity = 0;
          }
        });
      }
    });
  }

  /**
   * Continuous animation update for hint ring pulse, sparkles, and snap bounce
   */
  update(delta, now = performance.now()) {
    const t = now * 0.001;

    // 1. Warm gold hint ring (Active for only 2 seconds after Hint button click)
    if (this.hintRingGroup.visible) {
      if (now >= this.hintEndTime) {
        this.hideGoldHintRing();
      } else {
        const remaining = Math.max(0, this.hintEndTime - now);
        const fade = Math.min(1.0, remaining / 400); // fade out over last 400ms
        const pulse = 1.0 + Math.sin(t * 9) * 0.12;

        this.goldRing.scale.set(pulse, pulse, pulse);
        this.goldDot.scale.set(pulse * 0.95, pulse * 0.95, 1);
        this.goldRingMat.opacity = (0.65 + Math.sin(t * 9) * 0.3) * fade;
        this.goldDotMat.opacity = (0.55 + Math.sin(t * 9) * 0.25) * fade;
      }
    }

    // 2. Star Sparkle Particle Fade
    for (let i = this.sparkleParticles.length - 1; i >= 0; i--) {
      const p = this.sparkleParticles[i];
      p.life -= delta * p.decay;

      if (p.life <= 0) {
        this.sparkleGroup.remove(p.mesh);
        p.material.dispose();
        this.sparkleParticles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.vy -= 4.2 * delta;
      p.vx *= 0.93;
      p.vz *= 0.93;

      p.mesh.rotation.z += p.rotSpeed * delta;

      const s = p.scale * Math.max(0, p.life);
      p.mesh.scale.set(s, s, s);
      p.material.opacity = Math.max(0, p.life);
    }

    // 3. Brief snap scale bounce (scale: 1.0 -> 1.06 -> 1.0)
    for (let i = this.squashList.length - 1; i >= 0; i--) {
      const item = this.squashList[i];
      const elapsed = now - item.startTime;
      const progress = Math.min(1.0, elapsed / item.duration);

      if (progress >= 1.0) {
        item.mesh.scale.copy(item.baseScale);
        this.squashList.splice(i, 1);
      } else {
        // Half-sine: peaks at scale 1.06
        const scaleFactor = 1.0 + Math.sin(progress * Math.PI) * 0.06;
        item.mesh.scale.set(
          item.baseScale.x * scaleFactor,
          item.baseScale.y * scaleFactor,
          item.baseScale.z * scaleFactor
        );
      }
    }
  }

  dispose() {
    this.scene.remove(this.hintRingGroup);
    this.scene.remove(this.sparkleGroup);
    this.sparkleParticles.forEach((p) => p.material.dispose());
    this.sparkleParticles = [];
  }
}

/**
 * Checks whether pointer coordinates fall within the tray area or over tray DOM elements
 */
export function isPointerOverTray(clientX, clientY, trayElement = null) {
  if (typeof document === 'undefined') return false;

  const tray = trayElement || document.getElementById('parts-tray') || document.querySelector('.toy-parts-tray');
  if (tray && typeof tray.getBoundingClientRect === 'function') {
    const rect = tray.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return true;
    }
  }

  if (typeof document.elementFromPoint === 'function') {
    const el = document.elementFromPoint(clientX, clientY);
    if (el && el.closest && el.closest('#parts-tray, .toy-parts-tray, .toy-card')) {
      return true;
    }
  }

  return false;
}

/**
 * Standalone pointermove raycast helper matching the user-specified quantization logic:
 * draggedBrick.position.x = Math.round(p.x / 0.8) * 0.8;
 * draggedBrick.position.z = Math.round(p.z / 0.8) * 0.8;
 * draggedBrick.position.y = hits[0].point.y + (draggedBrick.userData.height || 0.32) / 2;
 */
export function onPointerMove(e, draggedBrick, camera, baseplateMesh, staticPlacedBricks = [], raycaster = null, mouse = null) {
  if (!draggedBrick || !camera) return null;

  const m = mouse || new THREE.Vector2();
  const width = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1;
  const height = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 1;

  const clientX = (e && typeof e.clientX === 'number') ? e.clientX : (typeof e === 'number' ? e : 0);
  const clientY = (e && typeof e.clientY === 'number') ? e.clientY : (arguments[7] && typeof arguments[7] === 'number' ? arguments[7] : 0);

  m.x = (clientX / width) * 2 - 1;
  m.y = -(clientY / height) * 2 + 1;

  const r = raycaster || new THREE.Raycaster();
  r.setFromCamera(m, camera);

  const targets = [];
  if (baseplateMesh) targets.push(baseplateMesh);
  if (staticPlacedBricks && staticPlacedBricks.length > 0) {
    targets.push(...staticPlacedBricks);
  }

  const hits = r.intersectObjects(targets, true).filter((h) => {
    let curr = h.object;
    while (curr) {
      if (curr === draggedBrick) return false;
      if (curr.userData?.isEnvironment) return false;
      curr = curr.parent;
    }
    return true;
  });

  if (hits.length > 0) {
    const p = hits[0].point;
    p.x = THREE.MathUtils.clamp(p.x, -4.5, 4.5);
    p.z = THREE.MathUtils.clamp(p.z, -3.5, 3.5);
    draggedBrick.position.x = Math.round(p.x / 0.8) * 0.8;
    draggedBrick.position.z = Math.round(p.z / 0.8) * 0.8;
    draggedBrick.position.y = hits[0].point.y + (draggedBrick.userData?.height || 0.32) / 2;
    draggedBrick.visible = true;
    return hits[0];
  }
  return null;
}

export function startDraggingPiece(piece) {
  if (!piece) return;
  piece.visible = false; // Hide until pointer hits a valid raycast point
}

/**
 * 4. TRACK ELEVATION & FLUSH GROUNDING:
 * Ensure the track group sits directly on top of the floor mesh at y = 0.
 */
export function setupTrack(trackGroup) {
  if (!trackGroup) return;
  trackGroup.position.set(0, 0, 0);
  trackGroup.rotation.set(0, 0, 0);
  trackGroup.scale.set(1, 1, 1);
  trackGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}


